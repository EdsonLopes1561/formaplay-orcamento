import { useState } from 'react';
import { X, MessageCircle, RefreshCw, Mailbox, Check, Archive, AlertCircle, Copy } from 'lucide-react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      case 'Convertida': return <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/30">{status}</span>;
      case 'Pendente': return <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-amber-500/30">{status}</span>;
      case 'Arquivada': return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-slate-500/30">{status}</span>;
      case 'Spam': return <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-rose-500/30">{status}</span>;
      default: return <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-500/30">{status}</span>;
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

  const copiarMensagemResponderLead = async (sol: SolicitacaoOrcamento) => {
    const nome = sol.nome_razao.split(' ')[0];

    let itensTexto = '';
    if (sol.itens && Array.isArray(sol.itens) && sol.itens.length > 0) {
      itensTexto = sol.itens.map((item: any) => `* ${item.quantidade}x ${item.nome}`).join('\n');
    } else {
      itensTexto = `* ${sol.quantidade}x ${sol.jogo_escolhido}`;
    }

    let freteTexto = 'A combinar';
    if (sol.frete_estimado > 0) {
      const regexFrete = /FRETE:\s*([^|]+)/i;
      const match = sol.observacoes_cliente?.match(regexFrete);
      if (match && match[1]) {
        freteTexto = match[1].trim();
      } else {
        const valFmt = sol.frete_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        freteTexto = `Padrão — R$ ${valFmt}`;
      }
    }

    const valFmtTotal = sol.total_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalTexto = sol.frete_estimado > 0 
      ? `R$ ${valFmtTotal}` 
      : `R$ ${valFmtTotal} + frete`;

    const mensagem = `Olá, ${nome}! Tudo bem?

Recebemos sua solicitação pelo site da FormaPlay.

Itens solicitados:
${itensTexto}

Frete selecionado: ${freteTexto}
Total estimado: ${totalTexto}

Vou conferir os dados e já te envio o orçamento formal em PDF.

Qualquer dúvida, fico à disposição.

Edson Lopes
FormaPlay — Jogos Educacionais`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(mensagem);
        setCopiedId(sol.id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error) {
      console.error(error);
      alert('Não foi possível copiar a mensagem. Copie manualmente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-md animate-fade-in transition-opacity">
      <div className="bg-blue-950 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-4xl max-h-[90vh] flex flex-col border border-blue-800/50 overflow-hidden text-slate-200">
        
        {/* Modal header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hidden sm:block">
              <Mailbox size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Inbox de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Solicitações</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">{solicitacoes.length} lead(s) capturado(s) pelo site</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2.5 rounded-xl bg-blue-900/80 text-emerald-400 hover:text-emerald-300 hover:bg-blue-800 transition-all border border-blue-800 shadow-sm disabled:opacity-50 active:scale-95"
              title="Atualizar"
            >
              <RefreshCw size={20} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-blue-900 hover:bg-slate-700 hover:text-white transition-all border border-blue-800 text-slate-400 shadow-sm active:scale-95"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-blue-950/80 border-b border-blue-900 flex gap-2 overflow-x-auto hide-scrollbar relative z-10">
          {Object.entries(counts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border active:scale-95 ${
                filtro === key 
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500/50' 
                  : 'bg-blue-900/50 text-slate-400 hover:bg-blue-800 hover:text-white border-blue-800'
              }`}
            >
              {key}
              <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                filtro === key ? 'bg-white/20 text-white' : 'bg-blue-950 text-slate-400 border border-blue-800'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-blue-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-900 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Atualizando...</p>
            </div>
          ) : solicitacoesFiltradas.length === 0 ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center bg-blue-900/20 rounded-3xl border border-dashed border-blue-800">
              <div className="p-4 bg-blue-900/50 rounded-full mb-4 border border-blue-800">
                <Mailbox size={48} className="opacity-50 text-slate-400" />
              </div>
              <p className="text-xl font-black text-white">Nenhuma solicitação encontrada</p>
              <p className="text-sm mt-1 font-medium">
                {filtro === 'Todas' ? 'Os clientes preencherão o formulário público no site.' : `Nenhuma solicitação com status "${filtro}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {solicitacoesFiltradas.map((sol) => (
                <div
                  key={sol.id}
                  className={`flex flex-col gap-4 p-5 rounded-2xl bg-blue-900/40 shadow-lg transition-all group relative overflow-hidden border border-blue-800 hover:bg-blue-900/60 hover:-translate-y-1 ${
                    sol.status === 'Convertida' ? 'opacity-80' : sol.status === 'Spam' || sol.status === 'Arquivada' ? 'opacity-60 grayscale-[0.2]' : ''
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full opacity-80 group-hover:opacity-100 transition-opacity ${
                    sol.status === 'Convertida' ? 'bg-emerald-500' :
                    sol.status === 'Pendente' ? 'bg-amber-500' :
                    sol.status === 'Spam' ? 'bg-rose-500' : 'bg-slate-500'
                  }`}></div>

                  {/* Cabecalho do Card */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 pl-2">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-black text-white text-lg">{sol.codigo}</span>
                        {getStatusBadge(sol.status)}
                        <span className="text-blue-800 font-bold hidden sm:inline">•</span>
                        <span className="text-xs font-bold text-slate-400">
                          {new Date(sol.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-bold text-emerald-400 truncate text-xl mb-1">{sol.nome_razao}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-300 font-medium">
                        <span className="flex items-center gap-1.5"><span className="text-emerald-500/70">📱</span> {sol.telefone}</span>
                        {sol.email && <span className="flex items-center gap-1.5"><span className="text-indigo-400/70">✉️</span> {sol.email}</span>}
                      </div>
                    </div>
                    
                    {/* Botoes de Acao Principais */}
                    <div className="flex flex-wrap gap-2 md:justify-end pl-2 md:pl-0">
                      <button
                        onClick={() => enviarWhatsApp(sol)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-xs font-bold rounded-xl hover:bg-[#25D366] hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <MessageCircle size={16} strokeWidth={2.5} /> WhatsApp
                      </button>
                      <button
                        onClick={() => copiarMensagemResponderLead(sol)}
                        className={`flex items-center gap-1.5 px-4 py-2 border text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                          copiedId === sol.id
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                            : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600 hover:text-white'
                        }`}
                      >
                        <Copy size={16} strokeWidth={2.5} /> {copiedId === sol.id ? 'Copiado!' : 'Responder Lead'}
                      </button>
                      {sol.status === 'Pendente' && (
                        <button
                          onClick={() => onConverter(sol)}
                          disabled={updating === sol.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white border border-blue-500/50 text-xs font-bold rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] disabled:opacity-50 active:scale-95 cursor-pointer"
                          title="Preencher no Painel de Orçamentos"
                        >
                          <Check size={16} strokeWidth={2.5} /> Converter
                        </button>
                      )}
                      {sol.status === 'Pendente' && (
                        <button
                          onClick={() => atualizarStatus(sol.id, 'Arquivada')}
                          disabled={updating === sol.id}
                          className="flex items-center justify-center p-2 bg-slate-700/50 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-600 hover:text-white transition-all shadow-sm border border-slate-600 disabled:opacity-50 active:scale-95 cursor-pointer"
                          title="Arquivar"
                        >
                          <Archive size={16} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detalhes da Solicitacao */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-blue-900/30 p-4 rounded-xl border border-blue-800/50 ml-2">
                    {sol.itens && Array.isArray(sol.itens) && sol.itens.length > 0 ? (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Itens Solicitados</p>
                          <div className="space-y-2">
                            {sol.itens.map((item: any, idx: number) => (
                              <div key={item.sku || idx} className="text-sm text-slate-300 leading-tight">
                                <span className="font-bold text-white">{item.quantidade}x</span> {item.nome} <span className="text-[10px] text-slate-500 font-mono">({item.sku}{item.revisao ? ` ${item.revisao}` : ''})</span>
                                <div className="text-xs text-slate-400 pl-4 mt-0.5">
                                  {fmt(item.valor_unitario)} cada • subtotal: <span className="font-bold text-slate-300">{fmt(item.subtotal)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {sol.embrulho_presente && (
                            <div className="mt-2">
                              <span className="inline-block bg-pink-500/10 text-pink-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-pink-500/20">
                                🎁 Embrulho para presente incluso
                              </span>
                            </div>
                          )}
                          {sol.frete_estimado === 0 && sol.observacoes_cliente?.toLowerCase().includes('frete a combinar') && (
                            <div className="mt-2">
                              <span className="inline-block bg-blue-500/15 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-blue-500/20 uppercase tracking-wider">
                                🚚 Frete a Combinar
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="md:text-right flex flex-col justify-between">
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total dos Produtos</p>
                            <p className="text-lg font-bold text-slate-200">{fmt(sol.valor_estimado)}</p>
                          </div>
                          <div className="mt-2">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Estimado</p>
                            <p className="text-xl font-black text-emerald-400">
                              {sol.frete_estimado > 0 ? fmt(sol.total_estimado) : `${fmt(sol.total_estimado)} + frete`}
                            </p>
                            <p className="text-xs text-slate-400 font-bold mt-1">Pgto: <span className="text-slate-300">{sol.forma_pagamento}</span></p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Pedido Solicitado</p>
                          <p className="text-base font-bold text-slate-200">{sol.quantidade}x {sol.jogo_escolhido}</p>
                          {sol.embrulho_presente && (
                            <span className="inline-block mt-2 bg-pink-500/10 text-pink-400 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-pink-500/20">
                              🎁 Embrulho para presente incluso
                            </span>
                          )}
                        </div>
                        <div className="md:text-right">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Total Estimado</p>
                          <p className="text-xl font-black text-emerald-400">{fmt(sol.total_estimado)}</p>
                          <p className="text-xs text-slate-400 font-bold mt-1">Pgto: <span className="text-slate-300">{sol.forma_pagamento}</span></p>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Endereco e Observacoes */}
                  <div className="flex flex-col gap-3 mt-1 ml-2">
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      <span className="font-bold text-amber-400/80 mr-1">📍 Endereço:</span> 
                      {sol.endereco}, {sol.numero} {sol.complemento ? `(${sol.complemento})` : ''} - {sol.bairro}, {sol.cidade}/{sol.estado} - {sol.cep}
                    </p>
                    {sol.observacoes_cliente && (
                      <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                        <p className="text-xs text-amber-400 font-medium leading-relaxed">
                          <span className="font-black uppercase tracking-wider mr-1">📝 Obs do Cliente:</span> 
                          {sol.observacoes_cliente}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Controles de Status Secundarios */}
                  <div className="flex flex-wrap justify-end gap-3 mt-3 pt-3 border-t border-blue-800/50 ml-2">
                    {sol.status !== 'Pendente' && (
                      <button
                        onClick={() => atualizarStatus(sol.id, 'Pendente')}
                        disabled={updating === sol.id}
                        className="text-xs font-bold text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors"
                      >
                        Restaurar para Pendente
                      </button>
                    )}
                    {sol.status !== 'Spam' && (
                      <button
                        onClick={() => atualizarStatus(sol.id, 'Spam')}
                        disabled={updating === sol.id}
                        className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                      >
                        <AlertCircle size={14} strokeWidth={2.5} /> Marcar como Spam
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

