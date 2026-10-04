import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  RefreshCw, 
  Package, 
  ExternalLink, 
  User, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Truck,
  ArrowRight,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { TOTAL_ETAPAS_PRODUCAO } from '../constants/etapasTimeline';
import { 
  avaliarSituacaoPrazo, 
  classificarPedidoProducao, 
  obterProximaEtapa, 
  calcularPercentualProducao, 
  formatarDataAtualizacao,
  formatarDataCriacao,
  ordenarFilaProducao,
  CategoriaOperacional
} from '../utils/prazoProducao';

interface PainelProducaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAbrirOrdem: (orcamento: any) => void;
}

export function PainelProducaoModal({ isOpen, onClose, onAbrirOrdem }: PainelProducaoModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingCompleto, setFetchingCompleto] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  
  // Filtros
  const [filtroCategoria, setFiltroCategoria] = useState<string>('fila_operacional');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('Todas');
  const [filtroPrazo, setFiltroPrazo] = useState<string>('Todos');
  const [termoBusca, setTermoBusca] = useState<string>('');

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          id, numero, cliente, produto, quantidade, status, 
          status_acompanhamento, status_atualizado_em,
          status_producao, producao_checklist, producao_atualizado_em, created_at,
          prioridade_producao, prazo_producao, observacao_prioridade, observacao_producao,
          prazo_entrega, data_envio, data_entrega, transportadora,
          cliente_cidade, cliente_uf, cidade
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

  const hoje = useMemo(() => new Date(), []);

  // KPIs dos 4 Cards Resumo no Topo
  const statsResumo = useMemo(() => {
    let aguardando = 0;
    let emProducao = 0;
    let prontos = 0;
    let atencaoOuAtrasado = 0;

    pedidos.forEach(p => {
      const cat = classificarPedidoProducao(p);
      const sit = avaliarSituacaoPrazo(p, hoje);

      // Não contar pedidos entregues ou cancelados nos cards operacionais
      if (cat === 'entregue' || cat === 'cancelado' || cat === 'transporte') {
        return;
      }

      if (cat === 'aguardando_producao') {
        aguardando++;
      } else if (cat === 'em_producao') {
        emProducao++;
      } else if (cat === 'pronto_envio') {
        prontos++;
      }

      // Atenção ou Atrasados
      if (sit.categoria === 'atrasado' || sit.categoria === 'vence_hoje' || sit.categoria === 'atencao') {
        atencaoOuAtrasado++;
      }
    });

    return { aguardando, emProducao, prontos, atencaoOuAtrasado };
  }, [pedidos, hoje]);

  // Filtragem e Ordenação Inteligente
  const pedidosProcessados = useMemo(() => {
    let filtrados = pedidos;

    // 1. Filtro de Categoria Operacional
    if (filtroCategoria === 'fila_operacional') {
      // Fila principal: exclui entregues, cancelados e transporte
      filtrados = filtrados.filter(p => {
        const cat = classificarPedidoProducao(p);
        return cat !== 'entregue' && cat !== 'cancelado' && cat !== 'transporte';
      });
    } else if (filtroCategoria === 'aguardando_producao') {
      filtrados = filtrados.filter(p => classificarPedidoProducao(p) === 'aguardando_producao');
    } else if (filtroCategoria === 'em_producao') {
      filtrados = filtrados.filter(p => classificarPedidoProducao(p) === 'em_producao');
    } else if (filtroCategoria === 'pronto_envio') {
      filtrados = filtrados.filter(p => classificarPedidoProducao(p) === 'pronto_envio');
    } else if (filtroCategoria === 'atencao_atrasados') {
      filtrados = filtrados.filter(p => {
        const cat = classificarPedidoProducao(p);
        if (cat === 'entregue' || cat === 'cancelado' || cat === 'transporte') return false;
        const sit = avaliarSituacaoPrazo(p, hoje);
        return sit.categoria === 'atrasado' || sit.categoria === 'vence_hoje' || sit.categoria === 'atencao';
      });
    } else if (filtroCategoria === 'expedicao_concluidos') {
      filtrados = filtrados.filter(p => {
        const cat = classificarPedidoProducao(p);
        return cat === 'transporte' || cat === 'entregue';
      });
    }
    // se filtroCategoria === 'todos', não filtra nada

    // 2. Filtro de Prioridade
    if (filtroPrioridade !== 'Todas') {
      filtrados = filtrados.filter(p => (p.prioridade_producao || 'Normal') === filtroPrioridade);
    }

    // 3. Filtro de Prazo
    if (filtroPrazo !== 'Todos') {
      filtrados = filtrados.filter(p => {
        const sit = avaliarSituacaoPrazo(p, hoje);
        if (filtroPrazo === 'Atrasados') return sit.categoria === 'atrasado';
        if (filtroPrazo === 'Vence hoje') return sit.categoria === 'vence_hoje';
        if (filtroPrazo === 'Atenção (1-2 dias)') return sit.categoria === 'atencao';
        if (filtroPrazo === 'No prazo') return sit.categoria === 'no_prazo';
        if (filtroPrazo === 'Sem prazo') return sit.categoria === 'sem_prazo';
        return true;
      });
    }

    // 4. Busca Textual Rápida
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      filtrados = filtrados.filter(p => {
        const num = String(p.numero || '').toLowerCase();
        const cli = String(p.cliente || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const prod = String(p.produto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cid = String(p.cidade || p.cliente_cidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return num.includes(termo) || cli.includes(termo) || prod.includes(termo) || cid.includes(termo);
      });
    }

    // 5. Ordenação Inteligente em Cascata
    return ordenarFilaProducao(filtrados, hoje);
  }, [pedidos, filtroCategoria, filtroPrioridade, filtroPrazo, termoBusca, hoje]);

  const handleAbrirOrdem = async (id: string) => {
    setFetchingCompleto(id);
    try {
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

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-[#0b1120] w-full max-w-7xl h-[94vh] rounded-3xl shadow-2xl flex flex-col border border-slate-800 overflow-hidden text-slate-200">
        
        {/* ============================================================
            1. CABEÇALHO DA TORRE DE CONTROLE
           ============================================================ */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-800 bg-[#0f172a]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-950/50 flex-shrink-0">
              <Layers size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Torre de Controle de Produção
                </h2>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Fábrica FormaPlay
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Acompanhamento operacional, esteira de montagem e controle de prazos
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button 
              onClick={carregarPedidos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all font-bold text-xs border border-slate-700 disabled:opacity-50 shadow-sm"
              title="Recarregar fila de produção"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : ''} />
              <span>Atualizar</span>
            </button>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 p-2 rounded-xl transition-all border border-slate-700"
              title="Fechar painel"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ============================================================
            2. CARDS RESUMO NO TOPO (4 Cards Clicáveis)
           ============================================================ */}
        <div className="p-4 sm:p-6 bg-slate-950/40 border-b border-slate-800/80">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Aguardando Produção */}
            <button
              onClick={() => setFiltroCategoria(filtroCategoria === 'aguardando_producao' ? 'fila_operacional' : 'aguardando_producao')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                filtroCategoria === 'aguardando_producao'
                  ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-950/50'
                  : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Início</span>
                <Clock size={18} className={filtroCategoria === 'aguardando_producao' ? 'text-blue-400' : 'text-slate-500'} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{statsResumo.aguardando}</span>
                <span className="text-xs text-slate-400 font-semibold">pedidos</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">Autorizados p/ produção</p>
            </button>

            {/* Card 2: Em Produção */}
            <button
              onClick={() => setFiltroCategoria(filtroCategoria === 'em_producao' ? 'fila_operacional' : 'em_producao')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                filtroCategoria === 'em_producao'
                  ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Em Produção</span>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-300">{statsResumo.emProducao}</span>
                <span className="text-xs text-slate-400 font-semibold">na esteira</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">Checklist em andamento</p>
            </button>

            {/* Card 3: Prontos para Envio */}
            <button
              onClick={() => setFiltroCategoria(filtroCategoria === 'pronto_envio' ? 'fila_operacional' : 'pronto_envio')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                filtroCategoria === 'pronto_envio'
                  ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-950/50'
                  : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Prontos p/ Envio</span>
                <CheckCircle2 size={18} className={filtroCategoria === 'pronto_envio' ? 'text-purple-400' : 'text-slate-500'} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-200">{statsResumo.prontos}</span>
                <span className="text-xs text-slate-400 font-semibold">100% prontos</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">Aguardando transporte</p>
            </button>

            {/* Card 4: Atenção / Atrasados */}
            <button
              onClick={() => setFiltroCategoria(filtroCategoria === 'atencao_atrasados' ? 'fila_operacional' : 'atencao_atrasados')}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                filtroCategoria === 'atencao_atrasados'
                  ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 shadow-lg shadow-rose-950/50'
                  : statsResumo.atencaoOuAtrasado > 0 
                    ? 'bg-rose-950/20 border-rose-900/50 hover:bg-rose-950/30' 
                    : 'bg-slate-900/60 border-slate-800/90 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Atenção / Atrasados</span>
                <AlertTriangle size={18} className="text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-rose-300">{statsResumo.atencaoOuAtrasado}</span>
                <span className="text-xs text-slate-400 font-semibold">críticos</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">Vencendo ou atrasados</p>
            </button>

          </div>
        </div>

        {/* ============================================================
            3. BARRA DE BUSCA E FILTROS COMPLEMENTARES
           ============================================================ */}
        <div className="bg-[#0f172a]/60 border-b border-slate-800/80 px-4 sm:px-6 py-3 space-y-3">
          
          {/* Linha 1: Busca e Categorias Operacionais */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Buscar por número (#0034), cliente ou produto..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs font-medium focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 items-center">
              {[
                { id: 'fila_operacional', label: 'Fila Operacional' },
                { id: 'aguardando_producao', label: 'Aguardando' },
                { id: 'em_producao', label: 'Em Produção' },
                { id: 'pronto_envio', label: 'Prontos' },
                { id: 'atencao_atrasados', label: 'Atenção/Atrasados' },
                { id: 'expedicao_concluidos', label: 'Expedição/Concluídos' },
                { id: 'todos', label: 'Todos' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFiltroCategoria(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    filtroCategoria === cat.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Linha 2: Filtros Secundários (Prioridade e Prazo) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/40 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Prioridade */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Prioridade:</span>
                {['Todas', 'Urgente', 'Alta', 'Normal'].map(prio => (
                  <button
                    key={prio}
                    onClick={() => setFiltroPrioridade(prio)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
                      filtroPrioridade === prio
                        ? prio === 'Urgente' ? 'bg-rose-950/80 text-rose-300 border-rose-600/50' :
                          prio === 'Alta' ? 'bg-amber-950/80 text-amber-300 border-amber-600/50' :
                          'bg-blue-950/80 text-blue-300 border-blue-600/50'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {prio}
                  </button>
                ))}
              </div>

              {/* Prazo */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Prazo:</span>
                {['Todos', 'Atrasados', 'Vence hoje', 'Atenção (1-2 dias)', 'No prazo', 'Sem prazo'].map(prz => (
                  <button
                    key={prz}
                    onClick={() => setFiltroPrazo(prz)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all border ${
                      filtroPrazo === prz
                        ? prz === 'Atrasados' ? 'bg-rose-950/80 text-rose-300 border-rose-600/50' :
                          prz === 'Vence hoje' || prz.includes('Atenção') ? 'bg-amber-950/80 text-amber-300 border-amber-600/50' :
                          prz === 'No prazo' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50' :
                          'bg-slate-800 text-slate-300 border-slate-600'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {prz}
                  </button>
                ))}
              </div>

            </div>

            <div className="text-[11px] text-slate-400 font-semibold">
              Exibindo <span className="text-white font-bold">{pedidosProcessados.length}</span> de <span className="text-slate-300">{pedidos.length}</span> pedidos
            </div>
          </div>

        </div>

        {/* ============================================================
            4. LISTA OPERACIONAL (CARDS DA TORRE DE CONTROLE)
           ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#080d1a]">
          {loading && pedidos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <RefreshCw size={36} className="animate-spin mb-4 text-emerald-400" />
              <p className="font-bold text-sm">Carregando fila de produção...</p>
            </div>
          ) : pedidosProcessados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800 p-8 text-center">
              <Package size={44} className="mb-3 opacity-40 text-slate-400" />
              <p className="font-black text-base text-slate-300">Nenhum pedido encontrado na seleção</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Alterne os filtros acima ou limpe o termo de busca para visualizar outros pedidos da fábrica.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {pedidosProcessados.map(pedido => {
                const situacao = avaliarSituacaoPrazo(pedido, hoje);
                const categoriaOp = classificarPedidoProducao(pedido);
                const checklistConcluido = Array.isArray(pedido.producao_checklist) ? pedido.producao_checklist : [];
                const percentual = calcularPercentualProducao(checklistConcluido);
                const proximaEtapa = obterProximaEtapa(checklistConcluido);
                const isLoadingRow = fetchingCompleto === pedido.id;
                const prioridade = pedido.prioridade_producao || 'Normal';
                const statusProd = pedido.status_producao || 'Não iniciada';
                const isPronto = categoriaOp === 'pronto_envio';
                const isEmProducao = categoriaOp === 'em_producao';
                const isAtrasado = situacao.categoria === 'atrasado';
                const isAtencao = situacao.categoria === 'atencao' || situacao.categoria === 'vence_hoje';

                const tempoAtualizado = formatarDataAtualizacao(
                  pedido.producao_atualizado_em || pedido.status_atualizado_em || pedido.created_at
                );
                const dataCriacao = formatarDataCriacao(pedido.created_at, pedido.data_orcamento);

                return (
                  <div
                    key={pedido.id}
                    className={`bg-slate-900/90 rounded-2xl border flex flex-col overflow-hidden transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 ${
                      isAtrasado ? 'border-rose-700/60 shadow-rose-950/20' :
                      isAtencao ? 'border-amber-600/60 shadow-amber-950/20' :
                      isPronto ? 'border-emerald-500/60 shadow-emerald-950/20' :
                      isEmProducao ? 'border-blue-600/50' :
                      'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header do Card */}
                    <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
                      isAtrasado ? 'bg-rose-950/30 border-rose-900/40' :
                      isAtencao ? 'bg-amber-950/30 border-amber-900/40' :
                      isPronto ? 'bg-emerald-950/30 border-emerald-900/40' :
                      isEmProducao ? 'bg-blue-950/30 border-blue-900/40' :
                      'bg-slate-800/40 border-slate-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white bg-slate-950/80 px-2.5 py-1 rounded-lg text-xs tracking-wider border border-slate-800 shadow-inner">
                          {pedido.numero || 'S-N'}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          prioridade === 'Urgente' ? 'bg-rose-950 text-rose-300 border-rose-600/60' :
                          prioridade === 'Alta' ? 'bg-amber-950 text-amber-300 border-amber-600/60' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {prioridade}
                        </span>
                      </div>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-sm ${
                        isPronto ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        categoriaOp === 'em_producao' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                        categoriaOp === 'transporte' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                        categoriaOp === 'entregue' ? 'bg-emerald-600/30 text-emerald-200 border-emerald-500/40' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {statusProd}
                      </span>
                    </div>

                    {/* Corpo do Card */}
                    <div className="p-4 flex-1 flex flex-col gap-3 text-slate-200">
                      
                      {/* Cliente e Localidade */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <User size={11} className="text-slate-500" /> Cliente
                        </p>
                        <p className="font-bold text-white text-sm truncate" title={pedido.cliente}>
                          {pedido.cliente || 'Não identificado'}
                        </p>
                        {(pedido.cidade || pedido.cliente_cidade) && (
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {pedido.cidade || pedido.cliente_cidade}{pedido.cliente_uf ? `/${pedido.cliente_uf}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Produto e Quantidade */}
                      <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-0.5">
                          <Package size={11} className="text-slate-500" /> Produto
                        </p>
                        <p className="font-semibold text-blue-300 text-xs truncate" title={pedido.produto}>
                          <span className="font-black text-emerald-400 mr-1.5">{pedido.quantidade}x</span>
                          {pedido.produto || 'Item não especificado'}
                        </p>
                      </div>

                      {/* Progresso de Produção */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produção</span>
                          <span className={`font-black text-xs ${isPronto ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {percentual}% ({checklistConcluido.length} de {TOTAL_ETAPAS_PRODUCAO} etapas)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isPronto 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                            }`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                      </div>

                      {/* Próxima Etapa */}
                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Próxima Etapa:
                        </span>
                        {proximaEtapa ? (
                          <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                            {proximaEtapa.label}
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                            Todas as {TOTAL_ETAPAS_PRODUCAO} etapas concluídas
                          </p>
                        )}
                      </div>

                      {/* Bloco de Prazo e Situação */}
                      <div className={`p-3 rounded-xl border ${
                        isAtrasado ? 'bg-rose-950/20 border-rose-800/40' :
                        isAtencao ? 'bg-amber-950/20 border-amber-800/40' :
                        situacao.categoria === 'no_prazo' ? 'bg-emerald-950/20 border-emerald-800/40' :
                        'bg-slate-950/40 border-slate-800/60'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prazo da Ordem</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            isAtrasado ? 'bg-rose-950 text-rose-300 border-rose-700/60' :
                            isAtencao ? 'bg-amber-950 text-amber-300 border-amber-700/60' :
                            situacao.categoria === 'no_prazo' ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {situacao.textoCurto}
                          </span>
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-bold text-slate-200 text-sm">
                            {situacao.dataPrazoFormatada}
                          </p>
                          <p className={`text-xs font-bold ${
                            isAtrasado ? 'text-rose-400' :
                            isAtencao ? 'text-amber-400' :
                            situacao.categoria === 'no_prazo' ? 'text-emerald-400' :
                            'text-slate-500'
                          }`}>
                            {situacao.textoDescritivo}
                          </p>
                        </div>
                      </div>

                      {/* Observação de Prioridade (se houver) */}
                      {pedido.observacao_prioridade && (
                        <div className="p-2 bg-slate-950/50 rounded-lg border border-slate-800/60 text-[11px] text-slate-400 leading-tight">
                          <span className="font-bold text-amber-400">Obs:</span> {pedido.observacao_prioridade}
                        </div>
                      )}

                    </div>

                    {/* Rodapé do Card */}
                    <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate">
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Criado:</span>
                          <span>{dataCriacao}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium truncate">
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Atualização:</span>
                          <span className="text-slate-300 font-semibold">{tempoAtualizado}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAbrirOrdem(pedido.id)}
                        disabled={isLoadingRow}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0 ${
                          isPronto
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/40'
                        } disabled:opacity-50`}
                      >
                        {isLoadingRow ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <ExternalLink size={14} />
                        )}
                        <span>Abrir Ordem</span>
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
