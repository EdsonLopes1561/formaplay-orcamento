import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, User, Mail, MessageCircle, AlertCircle, Save, Archive, ArchiveRestore, Trash2, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { interessesService, FiltroArquivado } from '../services/interessesService';
import { InteresseModelo, InteresseStatus } from '../types/interesses';
import { useAuth } from '../AuthWrapper';

interface PainelInteressesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

function obterMensagemErro(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return (error as Record<string, unknown>).message as string;
  }

  return 'Ocorreu um erro inesperado.';
}

export const PainelInteressesModal: React.FC<PainelInteressesModalProps> = ({ isOpen, onClose, onRefresh }) => {
  const { usuarioApp } = useAuth();
  const isAdmin = usuarioApp?.perfil === 'administrador';

  const [interesses, setInteresses] = useState<InteresseModelo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroModelo, setFiltroModelo] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroArquivado, setFiltroArquivado] = useState<FiltroArquivado>('ativos');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [obsText, setObsText] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const [expandedInteresseId, setExpandedInteresseId] = useState<string | null>(null);

  // Modais de confirmação
  const [arquivarId, setArquivarId] = useState<string | null>(null);
  const [arquivarMotivo, setArquivarMotivo] = useState('');
  
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [excluirConfirmText, setExcluirConfirmText] = useState('');

  const carregarInteresses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await interessesService.listarInteresses(filtroArquivado);
      setInteresses(data);
    } catch (error: unknown) {
      console.error('Erro ao listar interesses', error);
      alert('Erro ao carregar interesses. Verifique sua conexão e permissões.');
    } finally {
      setLoading(false);
    }
  }, [filtroArquivado]);

  useEffect(() => {
    if (isOpen) {
      carregarInteresses();
    }
  }, [isOpen, carregarInteresses]);

  // Fechar accordion se os filtros mudarem
  useEffect(() => {
    setExpandedInteresseId(null);
  }, [busca, filtroModelo, filtroStatus, filtroArquivado]);

  const handleMudarStatus = async (id: string, novoStatus: InteresseStatus) => {
    setSavingId(id);
    try {
      const interesse = interesses.find(i => i.id === id);
      if (!interesse) return;
      await interessesService.atualizarInteresse(id, novoStatus, interesse.observacao_interna || '');
      await carregarInteresses();
      onRefresh?.();
    } catch (error: unknown) {
      console.error('Erro ao atualizar status', error);
      alert('Erro ao atualizar status: ' + obterMensagemErro(error));
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
    } catch (error: unknown) {
      console.error('Erro ao salvar observação', error);
      alert('Erro ao salvar observação: ' + obterMensagemErro(error));
    } finally {
      setSavingId(null);
    }
  };

  const handleArquivar = async () => {
    if (!arquivarId) return;
    setSavingId(arquivarId);
    try {
      await interessesService.arquivarInteresse(arquivarId, arquivarMotivo);
      setArquivarId(null);
      setArquivarMotivo('');
      await carregarInteresses();
      onRefresh?.();
    } catch (error: unknown) {
      console.error('Erro ao arquivar', error);
      alert('Erro ao arquivar: ' + obterMensagemErro(error));
    } finally {
      setSavingId(null);
    }
  };

  const handleRestaurar = async (id: string) => {
    setSavingId(id);
    try {
      await interessesService.restaurarInteresse(id);
      await carregarInteresses();
      onRefresh?.();
    } catch (error: unknown) {
      console.error('Erro ao restaurar', error);
      alert('Erro ao restaurar: ' + obterMensagemErro(error));
    } finally {
      setSavingId(null);
    }
  };

  const handleExcluirDefinitivamente = async () => {
    if (!excluirId || excluirConfirmText !== 'EXCLUIR') return;
    setSavingId(excluirId);
    try {
      await interessesService.excluirInteresseDefinitivamente(excluirId);
      setExcluirId(null);
      setExcluirConfirmText('');
      await carregarInteresses();
      onRefresh?.();
    } catch (error: unknown) {
      console.error('Erro ao excluir', error);
      alert('Erro ao excluir: ' + obterMensagemErro(error));
    } finally {
      setSavingId(null);
    }
  };

  const normalizarWhatsAppBrasil = (numero?: string | null): string | null => {
    if (!numero) return null;

    let n = numero.replace(/\D/g, '');
    n = n.replace(/^0+/, '');

    // Número nacional: DDD + telefone
    if (n.length === 10 || n.length === 11) {
      return `55${n}`;
    }

    // Número já contendo DDI brasileiro
    if ((n.length === 12 || n.length === 13) && n.startsWith('55')) {
      return n;
    }

    return null;
  };

  const enviarMensagemWhatsApp = (item: InteresseModelo) => {
    const numero = normalizarWhatsAppBrasil(item.whatsapp);

    if (!numero || item.aceita_contato !== true) {
      return;
    }

    const primeiroNome = (item.nome || '').trim().split(' ')[0] || '';
    const texto = `Olá, ${primeiroNome}! Tudo bem?\n\nAqui é o Edson, da FormaPlay – Jogos Educacionais.\n\nAgradecemos pelo seu interesse no ${item.modelo_interesse}.\n\nSeu interesse foi registrado e, assim que tivermos novidades sobre o desenvolvimento e a disponibilidade desse modelo, entraremos em contato por aqui.\n\nObrigado por acompanhar os projetos da FormaPlay!`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const enviarEmail = (item: InteresseModelo) => {
    if (!item.email || item.aceita_contato !== true) return;
    
    const primeiroNome = (item.nome || '').trim().split(' ')[0] || '';
    const assunto = `FormaPlay – Obrigado pelo interesse no ${item.modelo_interesse}`;
    const corpo = `Olá, ${primeiroNome}!\n\nAgradecemos pelo seu interesse no ${item.modelo_interesse} da FormaPlay – Jogos Educacionais.\n\nSeu interesse foi registrado e, assim que tivermos novidades sobre o desenvolvimento e a disponibilidade desse modelo, entraremos em contato.\n\nObrigado por acompanhar os projetos da FormaPlay!\n\nAtenciosamente,\nEdson Lopes\nFormaPlay – Jogos Educacionais`;

    const url = `mailto:${item.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    window.open(url, '_blank');
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

  const formatDataSp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const dataStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
      const horaStr = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d);
      return `${dataStr} às ${horaStr}`;
    } catch (e) {
      return new Date(dateStr).toLocaleString('pt-BR');
    }
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
            value={filtroArquivado}
            onChange={(e) => setFiltroArquivado(e.target.value as FiltroArquivado)}
            className="py-2 px-4 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-teal-500 outline-none min-w-[150px]"
          >
            <option value="ativos">Apenas Ativos</option>
            <option value="arquivados">Arquivados</option>
            <option value="todos">Todos</option>
          </select>

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
        <div className="flex-1 overflow-auto p-6 bg-slate-900 relative">
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
            <div className="flex flex-col gap-3">
              {interessesFiltrados.map((item) => {
                const isExpanded = expandedInteresseId === item.id;
                
                return (
                  <div key={item.id} className={`rounded-xl border shadow-sm transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'bg-slate-800 border-slate-600 border-l-[4px] border-l-teal-500 shadow-lg' 
                      : item.arquivado 
                        ? 'bg-slate-800/30 border-slate-800 border-l-[4px] border-l-transparent opacity-80' 
                        : 'bg-slate-800/50 border-slate-700 border-l-[4px] border-l-transparent hover:border-slate-600'
                  }`}>
                    
                    {/* FAIXA COMPACTA (CABEÇALHO) */}
                    <div 
                      onClick={() => setExpandedInteresseId(isExpanded ? null : item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedInteresseId(isExpanded ? null : item.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      className={`p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors ${
                        isExpanded ? 'bg-slate-800' : ''
                      }`}
                    >
                      {/* Ícone e Nome + Status */}
                      <div className="flex items-center gap-3 md:w-1/3 min-w-[250px]">
                        {isExpanded ? <ChevronDown size={18} className="text-teal-400 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
                        <h3 className={`font-bold truncate flex-1 transition-colors ${isExpanded ? 'text-teal-300 text-[17px]' : 'text-white text-base'}`} title={item.nome}>{item.nome}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm shrink-0 ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                        {item.arquivado && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 shrink-0">
                            ARQUIVADO
                          </span>
                        )}
                      </div>
                      
                      {/* Resumo do Interesse */}
                      <div className="flex-1 text-xs md:text-sm text-slate-300 truncate opacity-90 pl-8 md:pl-0">
                        <span className="font-medium text-teal-300/80">{item.modelo_interesse}</span> 
                        <span className="text-slate-600 mx-1.5">|</span> 
                        <span className="capitalize">{item.tipo_interessado?.replace('_', ' ') || 'N/A'}</span> 
                        <span className="text-slate-600 mx-1.5">|</span> 
                        {item.quantidade_estimada ? `${item.quantidade_estimada} un.` : 'Qtd. N/A'}
                      </div>
                      
                      {/* Data */}
                      <div className={`text-xs shrink-0 flex items-center gap-1 pl-8 md:pl-0 font-medium ${isExpanded ? 'text-slate-400' : 'text-slate-300'}`}>
                        <Clock size={12} /> {formatDataSp(item.created_at)}
                      </div>
                    </div>

                    {/* CONTEÚDO EXPANDIDO */}
                    {isExpanded && (
                      <div 
                        className="p-5 border-t border-teal-500/40 bg-slate-900/60 animate-in slide-in-from-top-2 fade-in duration-200 cursor-default"
                        onClick={(e) => e.stopPropagation()} // Evita fechar ao clicar no fundo do conteúdo
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                          
                          {/* COLUNA 1: Contato */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-teal-400 mb-3 border-b border-slate-700/50 pb-1 text-sm uppercase tracking-wider flex items-center gap-2">
                                <User size={14}/> Contato
                              </h4>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <MessageCircle size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                  <span className="text-slate-300 break-all">{item.whatsapp || 'Não informado'}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Mail size={14} className="text-slate-500 mt-0.5 shrink-0" />
                                  <span className="text-slate-300 break-all">{item.email || 'Não informado'}</span>
                                </div>
                                {(item.cidade || item.estado) && (
                                  <div className="text-slate-400 text-xs mt-2 pl-6">
                                    {item.cidade || ''}{item.estado ? ` - ${item.estado}` : ''}
                                  </div>
                                )}
                                <div className="text-slate-400 text-xs pl-6">
                                  Origem: {item.origem === 'site_formaplay' ? 'Site FormaPlay' : item.origem}
                                </div>
                              </div>
                            </div>
                            
                            {/* Ações de Contato Rápidas */}
                            <div className="pt-2">
                              {item.aceita_contato === false || item.aceita_contato == null ? (
                                <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2 text-center text-xs text-slate-400">
                                  {item.aceita_contato === false ? 'Contato não autorizado' : 'Autorização não informada'}
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {item.whatsapp && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); enviarMensagemWhatsApp(item); }}
                                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors border border-emerald-500/20 text-sm font-medium"
                                    >
                                      <MessageCircle size={14} /> Chamar no WhatsApp
                                    </button>
                                  )}
                                  
                                  {item.email && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); enviarEmail(item); }}
                                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors border border-blue-500/20 text-sm font-medium"
                                    >
                                      <Mail size={14} /> Enviar E-mail
                                    </button>
                                  )}
                                  
                                  {!item.whatsapp && !item.email && (
                                    <div className="text-xs text-slate-500 text-center py-1">Nenhum canal disponível</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* COLUNA 2: Interesse e Extra */}
                          <div className="lg:col-span-2 space-y-6 lg:border-l border-slate-700/50 lg:pl-8">
                            
                            {/* Interesse */}
                            <div>
                              <h4 className="font-semibold text-teal-400 mb-3 border-b border-slate-700/50 pb-1 text-sm uppercase tracking-wider">
                                Interesse
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500 text-xs block mb-0.5">Modelo</span> 
                                  <span className="text-teal-300 font-medium">{item.modelo_interesse}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-xs block mb-0.5">Perfil</span> 
                                  <span className="text-slate-300 capitalize">{item.tipo_interessado?.replace('_', ' ')}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-xs block mb-0.5">Quantidade</span> 
                                  <span className="text-slate-300">{item.quantidade_estimada}</span>
                                </div>
                                {item.interesse_personalizacao && (
                                  <div>
                                    <span className="text-slate-500 text-xs block mb-0.5">Personalização</span> 
                                    <span className="text-slate-300">{item.interesse_personalizacao}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Como pretende utilizar */}
                            {item.finalidade_uso && (
                              <div>
                                <h4 className="font-semibold text-teal-400 mb-2 border-b border-slate-700/50 pb-1 text-sm uppercase tracking-wider">
                                  Como pretende utilizar
                                </h4>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{item.finalidade_uso}</p>
                              </div>
                            )}

                            {/* Sugestão / Observações */}
                            {item.observacoes && (
                              <div>
                                <h4 className="font-semibold text-teal-400 mb-2 border-b border-slate-700/50 pb-1 text-sm uppercase tracking-wider">
                                  Sugestões / Observações
                                </h4>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{item.observacoes}</p>
                              </div>
                            )}

                          </div>

                          {/* COLUNA 3: Gestão */}
                          <div className="flex flex-col gap-4 lg:border-l border-slate-700/50 lg:pl-8">
                            <h4 className="font-semibold text-teal-400 mb-1 border-b border-slate-700/50 pb-1 text-sm uppercase tracking-wider">
                              Gestão
                            </h4>
                            
                            {!item.arquivado ? (
                              <>
                                <div>
                                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Atualizar Status</label>
                                  <select
                                    value={item.status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleMudarStatus(item.id, e.target.value as InteresseStatus)}
                                    disabled={savingId === item.id}
                                    className="w-full py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-teal-500 outline-none text-sm disabled:opacity-50"
                                  >
                                    <option value="novo">Novo</option>
                                    <option value="contatado">Contatado</option>
                                    <option value="em_validacao">Em Validação</option>
                                    <option value="aguardando_lancamento">Aguardando Lançamento</option>
                                    <option value="convertido">Convertido</option>
                                    <option value="sem_interesse">Sem Interesse</option>
                                  </select>
                                </div>

                                <div className="flex-1 flex flex-col mt-2">
                                  <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-semibold text-slate-500">Nota Interna</label>
                                    {editingId !== item.id && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setObsText(item.observacao_interna || ''); }}
                                        className="text-xs text-teal-400 hover:text-teal-300 hover:underline px-1"
                                      >
                                        Editar
                                      </button>
                                    )}
                                  </div>
                                  
                                  {editingId === item.id ? (
                                    <div className="flex flex-col gap-2">
                                      <textarea
                                        value={obsText}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setObsText(e.target.value)}
                                        className="w-full p-2 bg-slate-800 border border-teal-500/50 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-teal-500 resize-none h-24"
                                        placeholder="Digite uma observação..."
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                          className="flex-1 py-1.5 px-2 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSalvarObservacao(item.id, item.status); }}
                                          disabled={savingId === item.id}
                                          className="flex-1 py-1.5 px-2 text-xs text-slate-900 font-medium bg-teal-400 hover:bg-teal-300 rounded flex items-center justify-center gap-1 transition-colors"
                                        >
                                          {savingId === item.id ? '...' : <><Save size={12}/> Salvar</>}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex-1 flex items-start break-words overflow-hidden whitespace-pre-wrap min-h-[4rem]">
                                      {item.observacao_interna || <span className="text-slate-600 italic">Nenhuma observação.</span>}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-slate-700/50">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setArquivarId(item.id); }}
                                    disabled={savingId === item.id}
                                    className="w-full text-xs flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-900/10 text-amber-500 hover:bg-amber-900/30 hover:text-amber-400 transition-colors border border-amber-900/30"
                                  >
                                    <Archive size={14} /> Arquivar Registro
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col h-full justify-center gap-3">
                                {item.arquivado_em && (
                                  <div className="text-sm p-3 bg-slate-800/80 rounded border border-slate-700 mb-2">
                                    <div className="text-xs text-slate-500 mb-1">
                                      Arquivado em: {new Date(item.arquivado_em).toLocaleDateString('pt-BR')}
                                    </div>
                                    {item.motivo_arquivamento && (
                                      <div className="text-slate-400 italic mt-1 text-xs">"{item.motivo_arquivamento}"</div>
                                    )}
                                  </div>
                                )}
                                
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRestaurar(item.id); }}
                                  disabled={savingId === item.id}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-teal-900/20 text-teal-400 hover:bg-teal-900/40 transition-colors border border-teal-800/50 text-sm font-medium"
                                >
                                  <ArchiveRestore size={16} /> Restaurar
                                </button>
                                
                                {isAdmin && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExcluirId(item.id); setExcluirConfirmText(''); }}
                                    disabled={savingId === item.id}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors border border-red-800/50 text-sm font-medium"
                                  >
                                    <Trash2 size={16} /> Excluir Definitivamente
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Arquivamento */}
      {arquivarId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Archive className="text-amber-500" /> Confirmar Arquivamento
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              O registro será ocultado da listagem principal. Você pode informar um motivo opcional.
            </p>
            
            <textarea
              value={arquivarMotivo}
              onChange={(e) => setArquivarMotivo(e.target.value.substring(0, 500))}
              placeholder="Motivo do arquivamento (opcional)..."
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none h-24 resize-none mb-2"
            />
            <div className="text-xs text-slate-500 text-right mb-6">
              {arquivarMotivo.length}/500
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setArquivarId(null); setArquivarMotivo(''); }}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleArquivar}
                disabled={savingId === arquivarId}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors text-sm font-bold flex items-center gap-2"
              >
                {savingId === arquivarId ? 'Aguarde...' : 'Arquivar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão Definitiva */}
      {excluirId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border-2 border-red-900/50 rounded-xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2">
              <AlertCircle /> Exclusão Permanente
            </h3>
            
            <div className="mb-4 text-sm text-slate-300 space-y-2 bg-red-950/20 p-4 rounded-lg border border-red-900/30">
              <p>Você está prestes a excluir definitivamente o registro:</p>
              <div className="font-semibold text-white">
                {interesses.find(i => i.id === excluirId)?.nome}
              </div>
              <div className="text-slate-400">
                Modelo: {interesses.find(i => i.id === excluirId)?.modelo_interesse}
              </div>
              <p className="text-red-400 font-medium mt-2">Esta ação não poderá ser desfeita!</p>
            </div>
            
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Para confirmar, digite <span className="text-white font-bold select-all">EXCLUIR</span> no campo abaixo:
            </label>
            <input
              type="text"
              value={excluirConfirmText}
              onChange={(e) => setExcluirConfirmText(e.target.value)}
              placeholder="Digite EXCLUIR"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none mb-6"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setExcluirId(null); setExcluirConfirmText(''); }}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirDefinitivamente}
                disabled={excluirConfirmText !== 'EXCLUIR' || savingId === excluirId}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {savingId === excluirId ? 'Excluindo...' : 'Excluir Permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
