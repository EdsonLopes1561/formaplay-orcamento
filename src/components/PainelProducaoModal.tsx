import { useState, useEffect, useMemo } from 'react';
import { X, RefreshCw, Package, ExternalLink, User, Layers } from 'lucide-react';
import { supabase } from '../supabase';

interface PainelProducaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirOrdem: (orcamento: any) => void;
}

export function PainelProducaoModal({ isOpen, onClose, onAbrirOrdem }: PainelProducaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingCompleto, setFetchingCompleto] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('Produção ativa');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('Todas');
  const [filtroPrazo, setFiltroPrazo] = useState<string>('Todos');

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      // Busca apenas os campos necessários para economizar banda (seguindo a recomendação)
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          id, numero, cliente, produto, quantidade, status, 
          status_producao, producao_checklist, producao_atualizado_em, created_at,
          prioridade_producao, prazo_producao, observacao_prioridade
        `);
      
      if (error) throw error;
      setPedidos(data || []);
    } catch (err) {
      console.error('Erro ao carregar painel de produção:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarPedidos();
    }
  }, [isOpen]);

  const pedidosOrdenados = useMemo(() => {
    let filtrados = pedidos;
    if (filtroStatus !== 'Todos') {
      if (filtroStatus === 'Produção ativa') {
        filtrados = pedidos.filter(p => {
          const checklist = Array.isArray(p.producao_checklist) ? p.producao_checklist : [];
          return (
            p.status === 'Aprovado' ||
            p.status_producao === 'Em produção' ||
            p.status_producao === 'Em conferência' ||
            p.status_producao === 'Pronto para envio' ||
            checklist.length > 0
          );
        });
      } else if (filtroStatus === 'Não iniciada') {
        filtrados = pedidos.filter(p => !p.status_producao || p.status_producao === 'Não iniciada');
      } else {
        filtrados = pedidos.filter(p => p.status_producao === filtroStatus);
      }
    }

    const dt = new Date();
    const hojeStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    if (filtroPrioridade !== 'Todas') {
      filtrados = filtrados.filter(p => {
        const prio = p.prioridade_producao || 'Normal';
        return prio === filtroPrioridade;
      });
    }

    if (filtroPrazo !== 'Todos') {
      filtrados = filtrados.filter(p => {
        const prazo = p.prazo_producao;
        let pStatus = 'Sem prazo';
        if (prazo) {
          if (prazo < hojeStr) pStatus = 'Atrasados';
          else if (prazo === hojeStr) pStatus = 'Vence hoje';
          else pStatus = 'No prazo';
        }
        return pStatus === filtroPrazo;
      });
    }


    const getPrioridadeScore = (p?: string) => {
      if (p === 'Urgente') return 3;
      if (p === 'Alta') return 2;
      return 1;
    };

    return filtrados.sort((a, b) => {
      // 1º Prioridade
      const prioA = getPrioridadeScore(a.prioridade_producao);
      const prioB = getPrioridadeScore(b.prioridade_producao);
      if (prioA !== prioB) return prioB - prioA;

      // 2º Prazo Interno
      const prazoA = a.prazo_producao ? new Date(a.prazo_producao).getTime() : Number.MAX_SAFE_INTEGER;
      const prazoB = b.prazo_producao ? new Date(b.prazo_producao).getTime() : Number.MAX_SAFE_INTEGER;
      if (prazoA !== prazoB) return prazoA - prazoB;

      // 3º Fallback atualizado_em e created_at
      const dateA = a.producao_atualizado_em ? new Date(a.producao_atualizado_em).getTime() : 0;
      const dateB = b.producao_atualizado_em ? new Date(b.producao_atualizado_em).getTime() : 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      
      const createdA = new Date(a.created_at).getTime();
      const createdB = new Date(b.created_at).getTime();
      return createdB - createdA;
    });
  }, [pedidos, filtroStatus, filtroPrioridade, filtroPrazo]);

  const stats = useMemo(() => {
    const dt = new Date();
    const hojeStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    return pedidos.reduce((acc, p) => {
      const prio = p.prioridade_producao || 'Normal';
      const prazo = p.prazo_producao;
      
      if (prio === 'Urgente') acc.urgentes++;
      
      if (!prazo) {
        acc.semPrazo++;
      } else if (prazo < hojeStr) {
        acc.atrasados++;
      } else if (prazo === hojeStr) {
        acc.venceHoje++;
      }
      return acc;
    }, { urgentes: 0, atrasados: 0, venceHoje: 0, semPrazo: 0 });
  }, [pedidos]);

  const handleAbrirOrdem = async (id: string) => {
    setFetchingCompleto(id);
    try {
      // Como a lista só puxa campos parciais, buscamos o orçamento completo aqui 
      // para passar ao App.tsx de forma segura, evitando que ao salvar, os campos ausentes sejam apagados do banco.
      const { data, error } = await supabase.from('orcamentos').select('*').eq('id', id).single();
      if (error) throw error;
      onAbrirOrdem(data);
    } catch (err) {
      console.error('Erro ao buscar orçamento completo:', err);
      alert('Erro ao carregar os dados completos do pedido.');
    } finally {
      setFetchingCompleto(null);
    }
  };

  if (!isOpen) return null;

  const totalProducao = 17;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0f172a] w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-slate-700 overflow-hidden relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Layers className="text-emerald-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Painel de Produção</h2>
              <p className="text-sm text-slate-400 font-medium">Fila e acompanhamento interno de pedidos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={carregarPedidos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all font-bold text-sm border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-400' : ''} />
              Atualizar
            </button>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-red-500/20 hover:text-red-400 p-2 rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-900/30 border-b border-slate-800">
          <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-slate-800/50">
            {['Produção ativa', 'Não iniciada', 'Em produção', 'Em conferência', 'Pronto para envio', 'Todos'].map((status) => (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  filtroStatus === status 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          
          <div className="px-6 py-3 flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Prioridade:</span>
              {['Todas', 'Urgente', 'Alta', 'Normal'].map((prio) => (
                <button
                  key={prio}
                  onClick={() => setFiltroPrioridade(prio)}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all border ${
                    filtroPrioridade === prio 
                      ? prio === 'Urgente' ? 'bg-rose-900/40 text-rose-400 border-rose-500/30' :
                        prio === 'Alta' ? 'bg-amber-900/40 text-amber-400 border-amber-500/30' :
                        'bg-blue-900/40 text-blue-400 border-blue-500/30'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  {prio}
                </button>
              ))}

              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-2 mr-1">Prazo:</span>
              {['Todos', 'Atrasados', 'Vence hoje', 'No prazo', 'Sem prazo'].map((prz) => (
                <button
                  key={prz}
                  onClick={() => setFiltroPrazo(prz)}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all border ${
                    filtroPrazo === prz 
                      ? prz === 'Atrasados' ? 'bg-rose-900/40 text-rose-400 border-rose-500/30' :
                        prz === 'Vence hoje' ? 'bg-amber-900/40 text-amber-400 border-amber-500/30' :
                        prz === 'No prazo' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' :
                        'bg-blue-900/40 text-blue-400 border-blue-500/30'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700'
                  }`}
                >
                  {prz}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex gap-1.5 items-center bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                <span className="text-[10px] text-slate-400 font-bold">Urgentes: <span className="text-white">{stats.urgentes}</span></span>
              </div>
              <div className="flex gap-1.5 items-center bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                <span className="text-[10px] text-slate-400 font-bold">Atrasados: <span className="text-white">{stats.atrasados}</span></span>
              </div>
              <div className="flex gap-1.5 items-center bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <span className="text-[10px] text-slate-400 font-bold">Vence hoje: <span className="text-white">{stats.venceHoje}</span></span>
              </div>
              <div className="flex gap-1.5 items-center bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                <span className="text-[10px] text-slate-400 font-bold">Sem prazo: <span className="text-white">{stats.semPrazo}</span></span>
              </div>
            </div>
          </div>
        </div>


        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0B1120]">
          {loading && pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <RefreshCw size={32} className="animate-spin mb-4 text-emerald-400" />
              <p className="font-bold">Carregando fila de produção...</p>
            </div>
          ) : pedidosOrdenados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <Package size={48} className="mb-4 opacity-50" />
              <p className="font-bold text-lg">Nenhum pedido encontrado</p>
              <p className="text-sm">Mude os filtros para ver mais resultados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pedidosOrdenados.map((pedido) => {
                const statusProducao = pedido.status_producao || 'Não iniciada';
                const concluidoProducao = Array.isArray(pedido.producao_checklist) ? pedido.producao_checklist.length : 0;
                const producaoPercent = Math.round((concluidoProducao / totalProducao) * 100);
                
                const isPronto = statusProducao === 'Pronto para envio';
                const isEmProducao = statusProducao === 'Em produção';
                const isLoadingRow = fetchingCompleto === pedido.id;

                const prioridade = pedido.prioridade_producao || 'Normal';
                const prazo = pedido.prazo_producao;
                let prazoStatus = 'Sem prazo';
                
                const dt = new Date();
                const hojeStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                
                if (prazo) {
                  if (prazo < hojeStr) prazoStatus = 'Atrasado';
                  else if (prazo === hojeStr) prazoStatus = 'Vence hoje';
                  else prazoStatus = 'No prazo';
                }

                const formatPrazo = (iso: string) => {
                  const parts = iso.split('-');
                  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                  return iso;
                };

                return (
                  <div 
                    key={pedido.id} 
                    className={`bg-slate-900 rounded-xl border flex flex-col overflow-hidden transition-all shadow-lg hover:shadow-xl hover:border-slate-600 ${
                      isPronto ? 'border-emerald-500/50' : 'border-slate-700'
                    }`}
                  >
                    {/* Card Header */}
                    <div className={`px-4 py-3 border-b flex justify-between items-center ${
                      isPronto ? 'bg-emerald-950/30 border-emerald-900/50' : 
                      isEmProducao ? 'bg-blue-950/30 border-blue-900/50' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white bg-black/30 px-2 py-1 rounded text-sm">
                          {pedido.numero || 'S-N'}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          prioridade === 'Urgente' ? 'bg-rose-900/50 text-rose-400 border-rose-700/50' :
                          prioridade === 'Alta' ? 'bg-amber-900/50 text-amber-400 border-amber-700/50' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {prioridade}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                        isPronto ? 'bg-emerald-500 text-white' :
                        statusProducao === 'Não iniciada' ? 'bg-slate-700 text-slate-300' :
                        statusProducao === 'Em conferência' ? 'bg-purple-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {statusProducao}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <User size={10} /> Cliente
                        </p>
                        <p className="font-bold text-slate-200 text-sm truncate" title={pedido.cliente}>
                          {pedido.cliente || 'Sem identificação'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                          <Package size={10} /> Produto (Qtd: {pedido.quantidade})
                        </p>
                        <p className="font-medium text-blue-300 text-sm truncate" title={pedido.produto}>
                          {pedido.produto}
                        </p>
                      </div>

                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            Prazo Interno
                          </p>
                          <span className={`text-[10px] font-bold ${
                            prazoStatus === 'Atrasado' ? 'text-rose-400' :
                            prazoStatus === 'Vence hoje' ? 'text-amber-400' :
                            prazoStatus === 'No prazo' ? 'text-emerald-400' :
                            'text-slate-500'
                          }`}>
                            {prazoStatus}
                          </span>
                        </div>
                        <p className="font-bold text-slate-300 text-sm">
                          {prazo ? formatPrazo(prazo) : 'Não definido'}
                        </p>
                      </div>

                      {pedido.observacao_prioridade && (
                        <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/50">
                          <p className="text-[11px] text-slate-400 leading-tight">
                            <span className="font-bold text-slate-500">Obs:</span> {pedido.observacao_prioridade}
                          </p>
                        </div>
                      )}

                      {/* Progress */}
                      <div className="mt-auto pt-3 border-t border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso</p>
                          <p className={`text-[10px] font-bold ${isPronto ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {producaoPercent}%
                          </p>
                        </div>
                        <p className="font-bold text-slate-300 text-xs mb-2">
                          {concluidoProducao} de {totalProducao} itens concluídos
                        </p>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${isPronto ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                            style={{ width: `${producaoPercent}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-3 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Atualizado em</span>
                        <span className="text-xs text-slate-400 font-medium">
                          {pedido.producao_atualizado_em 
                            ? new Date(pedido.producao_atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                            : 'Nunca'}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => handleAbrirOrdem(pedido.id)}
                        disabled={isLoadingRow}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all shadow-md ${
                          isPronto 
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-800/50' 
                            : 'bg-slate-700 text-white hover:bg-emerald-600'
                        } disabled:opacity-50`}
                      >
                        {isLoadingRow ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <ExternalLink size={14} />
                        )}
                        Abrir Ordem
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
