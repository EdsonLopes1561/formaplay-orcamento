import React, { useState, useEffect } from 'react';
import { X, Search, User, Mail, MessageCircle, AlertCircle, Save, CheckCircle2 } from 'lucide-react';
import { interessesService } from '../services/interessesService';
import { InteresseModelo, InteresseStatus } from '../types/interesses';

interface PainelInteressesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PainelInteressesModal: React.FC<PainelInteressesModalProps> = ({ isOpen, onClose }) => {
  const [interesses, setInteresses] = useState<InteresseModelo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [obsText, setObsText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      carregarInteresses();
    }
  }, [isOpen]);

  const carregarInteresses = async () => {
    setLoading(true);
    try {
      const data = await interessesService.listarInteresses();
      setInteresses(data);
    } catch (error) {
      console.error('Erro ao listar interesses', error);
      alert('Erro ao carregar interesses. Verifique sua conexão e permissões.');
    } finally {
      setLoading(false);
    }
  };

  const handleMudarStatus = async (id: string, novoStatus: InteresseStatus) => {
    setSavingId(id);
    try {
      const interesse = interesses.find(i => i.id === id);
      if (!interesse) return;
      await interessesService.atualizarInteresse(id, novoStatus, interesse.observacao_interna || '');
      await carregarInteresses();
    } catch (error: any) {
      console.error('Erro ao atualizar status', error);
      alert('Erro ao atualizar status: ' + (error.message || 'Desconhecido'));
    } finally {
      setSavingId(null);
    }
  };

  const handleSalvarObservacao = async (id: string, currentStatus: InteresseStatus) => {
    setSavingId(id);
    try {
      await interessesService.atualizarInteresse(id, currentStatus, obsText);
      setEditingId(null);
      await carregarInteresses();
    } catch (error: any) {
      console.error('Erro ao salvar observação', error);
      alert('Erro ao salvar observação: ' + (error.message || 'Desconhecido'));
    } finally {
      setSavingId(null);
    }
  };

  const abrirWhatsApp = (numero: string | null) => {
    if (!numero) return;
    const numLimpo = numero.replace(/\D/g, '');
    window.open(`https://wa.me/55${numLimpo}`, '_blank');
  };

  const interessesFiltrados = interesses.filter(item => {
    const matchBusca = busca === '' || 
      item.nome.toLowerCase().includes(busca.toLowerCase()) || 
      (item.email || '').toLowerCase().includes(busca.toLowerCase()) ||
      (item.whatsapp || '').includes(busca);
    const matchModelo = filtroModelo === '' || item.modelo_interesse === filtroModelo;
    const matchStatus = filtroStatus === '' || item.status === filtroStatus;
    return matchBusca && matchModelo && matchStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-blue-900/50 text-blue-300 border border-blue-700/50';
      case 'contatado': return 'bg-amber-900/50 text-amber-300 border border-amber-700/50';
      case 'em_validacao': return 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50';
      case 'aguardando_lancamento': return 'bg-fuchsia-900/50 text-fuchsia-300 border border-fuchsia-700/50';
      case 'convertido': return 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50';
      case 'sem_interesse': return 'bg-slate-800 text-slate-300 border border-slate-600/50';
      default: return 'bg-slate-800 text-slate-300 border border-slate-600/50';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <User className="text-teal-400" />
              Painel de Interesses
            </h2>
            <p className="text-sm text-slate-400 mt-1">Gerencie os registros de interesse em modelos em desenvolvimento</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-800/50 border-b border-slate-800 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
            />
          </div>
          <select
            value={filtroModelo}
            onChange={(e) => setFiltroModelo(e.target.value)}
            className="py-2 px-4 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 outline-none min-w-[200px]"
          >
            <option value="">Todos os modelos</option>
            <option value="Desafio Logístico Premium">Desafio Logístico Premium</option>
            <option value="Desafio Kids">Desafio Kids</option>
            <option value="Edição do Professor">Edição do Professor</option>
          </select>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="py-2 px-4 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 outline-none min-w-[200px]"
          >
            <option value="">Todos os status</option>
            <option value="novo">Novo</option>
            <option value="contatado">Contatado</option>
            <option value="em_validacao">Em Validação</option>
            <option value="aguardando_lancamento">Aguardando Lançamento</option>
            <option value="convertido">Convertido</option>
            <option value="sem_interesse">Sem Interesse</option>
          </select>
          
          <div className="text-sm font-medium text-teal-400 bg-teal-400/10 px-3 py-1.5 rounded-lg border border-teal-400/20">
            {interessesFiltrados.length} registro(s)
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-400 font-medium">Carregando interesses...</p>
            </div>
          ) : interessesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <AlertCircle size={48} className="text-slate-600 mb-4" />
              <p className="text-slate-300 text-lg font-medium">Nenhum registro encontrado.</p>
              <p className="text-slate-500">Tente ajustar os filtros de busca.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {interessesFiltrados.map((item) => (
                <div key={item.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm hover:border-slate-600 transition-colors">
                  <div className="flex flex-col lg:flex-row gap-6">
                    
                    {/* Col 1: Basic Info */}
                    <div className="flex-1 min-w-[250px]">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-white">{item.nome}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-300 space-y-1 mt-3">
                        <div className="flex items-center gap-2">
                          <MessageCircle size={14} className="text-emerald-400" /> 
                          {item.whatsapp ? (
                            <button onClick={() => abrirWhatsApp(item.whatsapp)} className="hover:text-emerald-300 hover:underline">
                              {item.whatsapp}
                            </button>
                          ) : 'Não informado'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-blue-400" />
                          {item.email ? (
                            <a href={`mailto:${item.email}`} className="hover:text-blue-300 hover:underline">
                              {item.email}
                            </a>
                          ) : 'Não informado'}
                        </div>
                        <div className="text-slate-500 mt-1">
                          {item.cidade || 'Cidade não informada'}{item.estado ? ` - ${item.estado}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Context */}
                    <div className="flex-1 min-w-[250px] border-l border-slate-700 pl-6">
                      <div className="mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modelo</span>
                        <div className="font-medium text-teal-400">{item.modelo_interesse}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 block mb-0.5">Perfil</span>
                          <span className="text-slate-300 capitalize">{item.tipo_interessado?.replace('_', ' ') || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 block mb-0.5">Qtd. Estimada</span>
                          <span className="text-slate-300">{item.quantidade_estimada || 'N/A'}</span>
                        </div>
                      </div>
                      {item.observacoes && (
                        <div className="mt-3 text-sm">
                          <span className="text-xs text-slate-500 block mb-0.5">Obs. Cliente</span>
                          <p className="text-slate-400 italic">"{item.observacoes}"</p>
                        </div>
                      )}
                    </div>

                    {/* Col 3: Actions */}
                    <div className="lg:w-64 flex flex-col gap-3 border-l border-slate-700 pl-6">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 block mb-1">Atualizar Status</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleMudarStatus(item.id, e.target.value as InteresseStatus)}
                          disabled={savingId === item.id}
                          className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 outline-none text-sm disabled:opacity-50"
                        >
                          <option value="novo">Novo</option>
                          <option value="contatado">Contatado</option>
                          <option value="em_validacao">Em Validação</option>
                          <option value="aguardando_lancamento">Aguardando Lançamento</option>
                          <option value="convertido">Convertido</option>
                          <option value="sem_interesse">Sem Interesse</option>
                        </select>
                      </div>

                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-semibold text-slate-500">Nota Interna</label>
                          {editingId !== item.id && (
                            <button 
                              onClick={() => { setEditingId(item.id); setObsText(item.observacao_interna || ''); }}
                              className="text-xs text-teal-400 hover:text-teal-300 hover:underline"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                        
                        {editingId === item.id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={obsText}
                              onChange={(e) => setObsText(e.target.value)}
                              className="w-full p-2 bg-slate-900 border border-teal-500/50 rounded text-sm text-white outline-none focus:ring-1 focus:ring-teal-500 resize-none h-20"
                              placeholder="Digite uma observação..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingId(null)}
                                className="flex-1 py-1 px-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSalvarObservacao(item.id, item.status)}
                                disabled={savingId === item.id}
                                className="flex-1 py-1 px-2 text-xs text-slate-900 font-medium bg-teal-400 hover:bg-teal-300 rounded flex items-center justify-center gap-1 transition-colors"
                              >
                                {savingId === item.id ? '...' : <><Save size={12}/> Salvar</>}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-800 flex-1 flex items-start break-words overflow-hidden whitespace-pre-wrap">
                            {item.observacao_interna || <span className="text-slate-600 italic">Nenhuma observação.</span>}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-slate-500 text-right mt-auto">
                        Cadastrado em {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
