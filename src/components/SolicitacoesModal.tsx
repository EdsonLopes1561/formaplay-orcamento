import { useState } from 'react';
import { X, MessageCircle, RefreshCw, Mailbox, Check, Archive, Trash2, AlertCircle } from 'lucide-react';
import { SolicitacaoOrcamento } from '../types';
import { supabase } from '../supabase';

interface SolicitacoesModalProps {
  solicitacoes: SolicitacaoOrcamento[];
  onClose: () => void;
  onRefresh: () => void;
  onConverter: (solicitacao: SolicitacaoOrcamento) => void;
  loading: boolean;
}

export function SolicitacoesModal({
  solicitacoes,
  onClose,
  onRefresh,
  onConverter,
  loading,
}: SolicitacoesModalProps) {
  const fmt = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const [filtro, setFiltro] = useState<string>('Pendente');
  const [updating, setUpdating] = useState<string | null>(null);

  const counts = {
    Pendente: solicitacoes.filter(s => s.status === 'Pendente').length,
    Convertida: solicitacoes.filter(s => s.status === 'Convertida').length,
    Arquivada: solicitacoes.filter(s => s.status === 'Arquivada').length,
    Spam: solicitacoes.filter(s => s.status === 'Spam').length,
    Todas: solicitacoes.length,
  };

  const solicitacoesFiltradas = solicitacoes.filter(s => filtro === 'Todas' || s.status === filtro);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Convertida': return <span className="bg-green-100 text-green-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-200">{status}</span>;
      case 'Pendente': return <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">{status}</span>;
      case 'Arquivada': return <span className="bg-gray-100 text-gray-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-gray-200">{status}</span>;
      case 'Spam': return <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-200">{status}</span>;
      default: return <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200">{status}</span>;
    }
  };

  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      setUpdating(id);
      const { error } = await supabase
        .from('solicitacoes_orcamento')
        .update({ status: novoStatus })
        .eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  };

  const enviarWhatsApp = (solicitacao: SolicitacaoOrcamento) => {
    const texto = `Olá, tudo bem? Aqui é o Edson da FormaPlay. Recebemos sua solicitação de orçamento ${solicitacao.codigo} referente ao ${solicitacao.jogo_escolhido}. Vou analisar os dados e já retorno com a proposta.`;
    const num = solicitacao.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${num}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-t-4 border-indigo-500">
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 bg-gradient-to-r from-indigo-50 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Mailbox className="text-indigo-600" /> Inbox de Solicitações
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{solicitacoes.length} lead(s) capturado(s)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto hide-scrollbar">
          {Object.entries(counts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                filtro === key 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {key}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filtro === key ? 'bg-white/20 text-white' : 'bg-white text-gray-500 shadow-sm'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : solicitacoesFiltradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Mailbox size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-bold">Nenhuma solicitação encontrada</p>
              <p className="text-sm">
                {filtro === 'Todas' ? 'Os clientes preencherão o formulário público.' : `Nenhuma solicitação com status "${filtro}"`}
              </p>
            </div>
          ) : (
            solicitacoesFiltradas.map((sol) => (
              <div
                key={sol.id}
                className={`flex flex-col gap-3 p-4 rounded-xl bg-white shadow-sm border-l-4 transition-all group ${
                  sol.status === 'Pendente' ? 'border-amber-400 hover:shadow-md' :
                  sol.status === 'Convertida' ? 'border-green-500 opacity-80' :
                  sol.status === 'Spam' ? 'border-red-500 opacity-60' : 'border-gray-400 opacity-60'
                }`}
              >
                {/* Cabecalho do Card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-indigo-700 text-base">{sol.codigo}</span>
                      {getStatusBadge(sol.status)}
                      <span className="text-gray-300">•</span>
                      <span className="text-xs font-semibold text-gray-500">
                        {new Date(sol.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="font-bold text-gray-900 truncate text-lg">{sol.nome_razao}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span>📱 {sol.telefone}</span>
                      {sol.email && <span>✉️ {sol.email}</span>}
                    </div>
                  </div>
                  
                  {/* Botoes de Acao Principais */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => enviarWhatsApp(sol)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white text-xs font-bold rounded-lg hover:bg-[#1ebe5d] transition-all shadow-sm"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                    {sol.status === 'Pendente' && (
                      <button
                        onClick={() => onConverter(sol)}
                        disabled={updating === sol.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
                        title="Preencher no Painel de Orçamentos"
                      >
                        <Check size={14} /> Converter em Orçamento
                      </button>
                    )}
                    {sol.status === 'Pendente' && (
                      <button
                        onClick={() => atualizarStatus(sol.id, 'Arquivada')}
                        disabled={updating === sol.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50"
                        title="Arquivar"
                      >
                        <Archive size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalhes da Solicitacao */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Pedido</p>
                    <p className="text-sm font-semibold text-gray-900">{sol.quantidade}x {sol.jogo_escolhido}</p>
                    {sol.embrulho_presente && (
                      <span className="inline-block mt-1 bg-pink-100 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-200">
                        🎁 Embrulho para presente
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Estimado</p>
                    <p className="text-lg font-black text-indigo-700">{fmt(sol.total_estimado)}</p>
                    <p className="text-xs text-gray-600 font-medium">Pgto: {sol.forma_pagamento}</p>
                  </div>
                </div>
                
                {/* Endereco e Observacoes */}
                <div className="flex flex-col gap-2 mt-1">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">📍 Endereço:</span> {sol.endereco}, {sol.numero} {sol.complemento ? `(${sol.complemento})` : ''} - {sol.bairro}, {sol.cidade}/{sol.estado} - {sol.cep}
                  </p>
                  {sol.observacoes_cliente && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                      <span className="font-semibold">📝 Observações:</span> {sol.observacoes_cliente}
                    </p>
                  )}
                </div>

                {/* Controles de Status Secundarios */}
                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                  {sol.status !== 'Pendente' && (
                    <button
                      onClick={() => atualizarStatus(sol.id, 'Pendente')}
                      disabled={updating === sol.id}
                      className="text-xs font-bold text-amber-600 hover:text-amber-800 disabled:opacity-50"
                    >
                      Voltar para Pendente
                    </button>
                  )}
                  {sol.status !== 'Spam' && (
                    <button
                      onClick={() => atualizarStatus(sol.id, 'Spam')}
                      disabled={updating === sol.id}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                    >
                      <AlertCircle size={12} /> Marcar como Spam
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
