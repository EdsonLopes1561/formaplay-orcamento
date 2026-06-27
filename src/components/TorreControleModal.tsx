import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, BarChart2, DollarSign, Target, Activity, Users, MapPin, AlertTriangle, Calendar, Layers, CheckCircle, Package, FileText, MessageCircle, ArrowLeft, Flame, Sun, Snowflake, Filter, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

interface TorreControleModalProps {
  onClose: () => void;
}

export function TorreControleModal({ onClose }: TorreControleModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  
  // Filtros
  const [periodo, setPeriodo] = useState('Todos');
  const [fStatus, setFStatus] = useState('Todos');
  const [fProduto, setFProduto] = useState('Todos');
  const [fCidade, setFCidade] = useState('Todas');
  const [fPrioridade, setFPrioridade] = useState('Todas');

  // Drill-down
  const [detalheVisivel, setDetalheVisivel] = useState<any[] | null>(null);
  const [tituloDetalhe, setTituloDetalhe] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [orcRes, solRes] = await Promise.all([
          supabase.from('orcamentos').select('*').order('created_at', { ascending: false }),
          supabase.from('solicitacoes_orcamento').select('*').order('created_at', { ascending: false })
        ]);
        if (orcRes.error) throw orcRes.error;
        if (solRes.error) throw solRes.error;

        setOrcamentos(orcRes.data || []);
        setSolicitacoes(solRes.data || []);
      } catch (e) {
        console.error("Erro na Torre de Controle:", e);
        setError(true);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatCurrency = (value: any) => {
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const getStartDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (periodo === 'Hoje') return today;
    if (periodo === 'Esta semana') {
      const first = today.getDate() - today.getDay();
      return new Date(today.setDate(first));
    }
    if (periodo === 'Este mês') return new Date(today.getFullYear(), today.getMonth(), 1);
    if (periodo === 'Este ano') return new Date(today.getFullYear(), 0, 1);
    
    return null;
  };

  const getRegiaoNormalizada = (o: any) => {
      let rawCidade = String(o?.cidade || o?.cliente_cidade || '').trim();
      let rawEstado = String(o?.estado || o?.cliente_uf || '').trim().toUpperCase();
      let cReg = 'Não informado';

      if (rawCidade && rawCidade.toLowerCase() !== 'undefined' && rawCidade !== 'null') {
        rawCidade = rawCidade.replace(/[\/\-]+\s*$/, '').trim();
        
        const ufMatch = rawCidade.match(/[\/\-]\s*([A-Za-z]{2})$/);
        if (ufMatch) {
          rawCidade = rawCidade.replace(/[\/\-]\s*([A-Za-z]{2})$/, '').trim();
          if (!rawEstado) rawEstado = ufMatch[1].toUpperCase();
        }

        if (rawEstado && rawEstado.length >= 2) {
          cReg = `${rawCidade}/${rawEstado.slice(0,2)}`;
        } else {
          cReg = rawCidade;
        }
      }
      return cReg;
  };

  // Valores Únicos para Comboboxes e Mapa Canônico de Regiões
  const { uniqueProdutos, uniqueCidades, canonicalMap } = useMemo(() => {
    const prods = new Set<string>();
    const allCidades = new Set<string>();

    (orcamentos || []).forEach(o => {
      const p = String(o?.produto || '').trim();
      if (p) prods.add(p);
      const reg = getRegiaoNormalizada(o);
      allCidades.add(reg);
    });

    const arrCidades = Array.from(allCidades);
    const map = new Map<string, string>();

    arrCidades.forEach(c => {
      if (c !== 'Não informado' && !c.includes('/')) {
        const withUf = arrCidades.find(other => other.startsWith(c + '/'));
        if (withUf) {
          map.set(c, withUf);
        } else {
          map.set(c, c);
        }
      } else {
        map.set(c, c);
      }
    });

    const cids = new Set<string>();
    arrCidades.forEach(c => {
      const canonical = map.get(c) || c;
      if (canonical !== 'Não informado') cids.add(canonical);
    });

    return {
      uniqueProdutos: Array.from(prods).sort(),
      uniqueCidades: Array.from(cids).sort(),
      canonicalMap: map
    };
  }, [orcamentos]);

  const getRegiao = (o: any) => {
    const basic = getRegiaoNormalizada(o);
    return canonicalMap.get(basic) || basic;
  };

  // Filtragem Geral
  const orcamentosFiltrados = useMemo(() => {
    const start = getStartDate();
    const lista = Array.isArray(orcamentos) ? orcamentos : [];
    
    return lista.filter(o => {
      if (start && (!o?.created_at || new Date(o.created_at) < start)) return false;
      if (fStatus !== 'Todos' && (o?.status || 'Aberto') !== fStatus) return false;
      if (fPrioridade !== 'Todas' && (o?.prioridade || 'Baixa') !== fPrioridade) return false;
      if (fProduto !== 'Todos' && String(o?.produto || '').trim() !== fProduto) return false;
      if (fCidade !== 'Todas' && getRegiao(o) !== fCidade) return false;
      return true;
    });
  }, [orcamentos, periodo, fStatus, fPrioridade, fProduto, fCidade]);

  const solicitacoesFiltradas = useMemo(() => {
    const start = getStartDate();
    const lista = Array.isArray(solicitacoes) ? solicitacoes : [];
    if (!start) return lista;
    return lista.filter(s => s?.created_at && new Date(s.created_at) >= start);
  }, [solicitacoes, periodo]);

  // Cálculos de Cards (Drill-down maps)
  const cardsData = useMemo(() => {
    const aprovadosArr: any[] = [];
    const negociacaoArr: any[] = [];
    let totalOrcado = 0;
    let totalAprovado = 0;
    let totalNegociacao = 0;

    (orcamentosFiltrados || []).forEach(o => {
      const val = Number(o?.total) || 0;
      totalOrcado += val;
      const status = o?.status || 'Aberto';
      if (status === 'Aprovado') {
        totalAprovado += val;
        aprovadosArr.push(o);
      } else if (status === 'Aberto' || status === 'Enviado') {
        totalNegociacao += val;
        negociacaoArr.push(o);
      }
    });

    const aprovadosCount = aprovadosArr.length;
    const taxa = orcamentosFiltrados.length > 0 ? (aprovadosCount / orcamentosFiltrados.length) * 100 : 0;
    const ticketMedio = aprovadosCount > 0 ? totalAprovado / aprovadosCount : 0;

    return {
      totalOrcado, totalAprovado, totalNegociacao, taxa, ticketMedio,
      qtd: orcamentosFiltrados.length,
      aprovadosArr, negociacaoArr
    };
  }, [orcamentosFiltrados]);

  // Cálculos de Rankings & Saúde Follow-up
  const rankings = useMemo(() => {
    const produtos: Record<string, { qtd: number; valor: number }> = {};
    const clientes: Record<string, { qtd: number; valor: number }> = {};
    const regioes: Record<string, { qtd: number; valor: number }> = {};
    
    const atrasados: any[] = [];
    const hoje: any[] = [];
    const proximos: any[] = [];
    const altaPrioArr: any[] = [];
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const next7Days = new Date();
    next7Days.setDate(todayStart.getDate() + 7);

    (orcamentosFiltrados || []).forEach(o => {
      const val = Number(o?.total) || 0;
      const pName = String(o?.produto || 'Não informado').trim();
      const cName = String(o?.cliente || 'Não informado').trim();
      const cReg = getRegiao(o);
      
      if (!produtos[pName]) produtos[pName] = { qtd: 0, valor: 0 };
      produtos[pName].qtd++;
      produtos[pName].valor += val;

      if (!clientes[cName]) clientes[cName] = { qtd: 0, valor: 0 };
      clientes[cName].qtd++;
      clientes[cName].valor += val;

      if (!regioes[cReg]) regioes[cReg] = { qtd: 0, valor: 0 };
      regioes[cReg].qtd++;
      regioes[cReg].valor += val;

      // Follow-up
      const status = o?.status || 'Aberto';
      if (status !== 'Cancelado' && status !== 'Recusado') {
        if (o?.prioridade === 'Alta') altaPrioArr.push(o);
        
        if ((status === 'Aberto' || status === 'Enviado') && o?.data_retorno) {
          const retDate = new Date(o.data_retorno + 'T00:00:00');
          if (!isNaN(retDate.getTime())) {
            if (retDate < todayStart) atrasados.push(o);
            else if (retDate >= todayStart && retDate <= todayEnd) hoje.push(o);
            else if (retDate > todayEnd && retDate <= next7Days) proximos.push(o);
          }
        }
      }
    });

    const sortRanking = (obj: Record<string, any>) => Object.entries(obj).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    return {
      topProdutos: sortRanking(produtos),
      topClientes: sortRanking(clientes),
      topRegioes: sortRanking(regioes),
      followUp: {
        atrasados, hoje, proximos, altaPrioArr
      }
    };
  }, [orcamentosFiltrados]);

  // Cálculos do Funil
  const funnel = useMemo(() => {
    let enviados = 0;
    let aprovados = 0;
    (orcamentosFiltrados || []).forEach(o => {
      const st = o?.status || 'Aberto';
      if (st === 'Enviado') enviados++;
      if (st === 'Aprovado') aprovados++;
    });
    return {
      solicitacoes: solicitacoesFiltradas.length,
      orcamentos: orcamentosFiltrados.length,
      enviados,
      aprovados
    };
  }, [solicitacoesFiltradas, orcamentosFiltrados]);

  // Temperatura e Oportunidades
  const getTemperature = (o: any) => {
    const st = o?.status || 'Aberto';
    if (st === 'Aprovado' || st === 'Recusado' || st === 'Cancelado') return null;
    
    const isAlta = o?.prioridade === 'Alta';
    let atrasado = false;
    let nosProximos7 = false;
    
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const next7Days = new Date(); next7Days.setDate(todayStart.getDate() + 7);

    if (o?.data_retorno) {
      const retDate = new Date(o.data_retorno + 'T00:00:00');
      if (!isNaN(retDate.getTime())) {
        if (retDate < todayStart) atrasado = true;
        if (retDate >= todayStart && retDate <= next7Days) nosProximos7 = true;
      }
    }

    if (isAlta || atrasado) return 'quente';
    if (nosProximos7) return 'morna';
    return 'fria';
  };

  const agirAgora = useMemo(() => {
    return (orcamentosFiltrados || []).map(o => ({
      ...o,
      temp: getTemperature(o)
    }))
    .filter(o => o.temp !== null)
    .sort((a, b) => {
      const weight = { quente: 3, morna: 2, fria: 1 };
      if (weight[a.temp as keyof typeof weight] !== weight[b.temp as keyof typeof weight]) {
        return weight[b.temp as keyof typeof weight] - weight[a.temp as keyof typeof weight];
      }
      return (Number(b?.total) || 0) - (Number(a?.total) || 0);
    });
  }, [orcamentosFiltrados]);

  const sendWhatsApp = (orc: any) => {
    const fone = String(orc?.telefone || '').replace(/\D/g, '');
    if (!fone) {
      alert("Este orçamento não possui telefone cadastrado.");
      return;
    }
    const text = `Olá, tudo bem? Aqui é da FormaPlay. Estou entrando em contato sobre o orçamento enviado. Fico à disposição para qualquer dúvida.`;
    const desktopUrl = `whatsapp://send?phone=${fone}&text=${encodeURIComponent(text)}`;
    window.open(desktopUrl, '_blank');
  };

  const openDetalhe = (titulo: string, items: any[]) => {
    setTituloDetalhe(titulo);
    setDetalheVisivel(items);
  };

  const BarGraphic = ({ label, value, max, subValue }: { label: string, value: number, max: number, subValue?: string }) => {
    const safeMax = Number(max) || 0;
    const safeValue = Number(value) || 0;
    const percent = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
          <span className="truncate pr-2">{String(label)}</span>
          <span className="whitespace-nowrap font-bold text-slate-900">{formatCurrency(safeValue)} {subValue && <span className="text-slate-400 font-medium ml-1">({subValue})</span>}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full shadow-inner" style={{ width: `${Math.min(percent, 100)}%` }}></div>
        </div>
      </div>
    );
  };

  const FunnelGraphic = ({ data }: { data: any }) => {
    const max = Math.max(Number(data?.solicitacoes) || 0, Number(data?.orcamentos) || 0, Number(data?.enviados) || 0, Number(data?.aprovados) || 0, 1);
    const steps = [
      { label: 'Solicitações (Site)', value: Number(data?.solicitacoes) || 0, from: 'from-blue-400', to: 'to-blue-500' },
      { label: 'Orçamentos Gerados', value: Number(data?.orcamentos) || 0, from: 'from-indigo-400', to: 'to-indigo-500' },
      { label: 'Orçamentos Enviados', value: Number(data?.enviados) || 0, from: 'from-purple-400', to: 'to-purple-500' },
      { label: 'Orçamentos Aprovados', value: Number(data?.aprovados) || 0, from: 'from-emerald-400', to: 'to-emerald-500' },
    ];
    
    return (
      <div className="flex flex-col gap-4 py-2">
        {steps.map((step, idx) => (
          <div key={idx} className="relative group">
            <div className="flex justify-between text-xs mb-1.5 font-bold text-slate-600 uppercase tracking-wide">
              <span>{step.label}</span>
              <span className="text-slate-800">{step.value}</span>
            </div>
            <div className="w-full flex justify-center">
              <div className={`bg-gradient-to-r ${step.from} ${step.to} h-8 rounded-lg shadow-sm transition-all duration-700 ease-out group-hover:brightness-110`} style={{ width: `${Math.max((step.value / max) * 100, 5)}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-[#f8fafc] rounded-3xl w-full max-w-[1400px] max-h-[95vh] flex flex-col shadow-2xl border border-white/40 overflow-hidden animate-fade-in">
        
        {/* Cabeçalho Premium */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between p-6 bg-white border-b border-slate-200 shadow-sm relative z-10 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20">
              <Activity size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Torre de Controle <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400">FormaPlay</span></h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Visão analítica de orçamentos e inteligência comercial de alto impacto.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!detalheVisivel && (
              <div className="flex flex-wrap gap-2 justify-end mr-2">
                <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-1.5 border border-slate-200 shadow-sm">
                  <Calendar size={16} className="text-indigo-500 ml-2" />
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 pl-2 pr-6 focus:ring-0 cursor-pointer">
                    {['Todos', 'Hoje', 'Esta semana', 'Este mês', 'Este ano'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-1.5 border border-slate-200 shadow-sm">
                  <Filter size={14} className="text-slate-400 ml-2" />
                  <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 pl-2 pr-6 focus:ring-0 cursor-pointer">
                    <option value="Todos">Status (Todos)</option>
                    {['Aberto', 'Enviado', 'Aprovado', 'Recusado', 'Cancelado'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-1.5 border border-slate-200 shadow-sm hidden sm:flex">
                  <select value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-3 focus:ring-0 cursor-pointer">
                    <option value="Todas">Prioridade (Todas)</option>
                    {['Baixa', 'Média', 'Alta'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-1.5 border border-slate-200 shadow-sm hidden md:flex">
                  <select value={fProduto} onChange={(e) => setFProduto(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-3 focus:ring-0 cursor-pointer max-w-[140px]">
                    <option value="Todos">Produto (Todos)</option>
                    {uniqueProdutos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-1.5 border border-slate-200 shadow-sm hidden lg:flex">
                  <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-3 focus:ring-0 cursor-pointer max-w-[140px]">
                    <option value="Todas">Região (Todas)</option>
                    {uniqueCidades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button onClick={onClose} className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-all shadow-sm">
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-5"></div>
            <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">Carregando inteligência comercial...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-8">
            <AlertTriangle size={56} className="text-rose-500 mb-5" />
            <h3 className="text-2xl font-black text-slate-800">Falha ao processar os dados.</h3>
            <p className="text-slate-500 mt-2 font-medium">Não foi possível carregar as informações da Torre de Controle no momento.</p>
          </div>
        ) : detalheVisivel ? (
          
          /* VISÃO DETALHADA (DRILL-DOWN) */
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button onClick={() => setDetalheVisivel(null)} className="flex items-center justify-center p-2.5 bg-white border border-slate-200 shadow-sm rounded-xl hover:bg-slate-800 hover:text-white transition-all text-slate-600 group">
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{tituloDetalhe}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">{detalheVisivel.length} orçamentos encontrados nesta visão.</p>
                </div>
              </div>
            </div>

            {detalheVisivel.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Orçamento</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalheVisivel.map((orc, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                          <td className="py-4 px-6 text-sm font-black text-slate-700">#{orc?.numero_sequencial || orc?.id?.slice(0,6)}</td>
                          <td className="py-4 px-6 text-sm font-bold text-slate-800">{orc?.cliente || 'Não informado'}</td>
                          <td className="py-4 px-6 text-xs font-bold">
                            <span className={`px-3 py-1.5 rounded-lg ${
                              orc?.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' :
                              orc?.status === 'Enviado' ? 'bg-blue-100 text-blue-800' :
                              orc?.status === 'Recusado' ? 'bg-red-100 text-red-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {orc?.status || 'Aberto'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-black text-slate-900 text-right">{formatCurrency(orc?.total)}</td>
                          <td className="py-4 px-6 text-center">
                            <button onClick={() => sendWhatsApp(orc)} className="inline-flex text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl transition-colors shadow-sm" title="Chamar no WhatsApp">
                              <MessageCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                <AlertTriangle size={48} className="mb-4 opacity-50 text-slate-300" />
                <p className="font-medium text-slate-500">Nenhum registro corresponde ao filtro atual.</p>
              </div>
            )}
          </div>
          
        ) : (
          
          /* VISÃO GERAL (CARDS & GRAFICOS) */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            
            {/* Linha 1: Cards Principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
              <div onClick={() => openDetalhe('Total Orçado', orcamentosFiltrados)} className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Orçado</span>
                  <Layers size={18} className="text-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-black text-slate-800 truncate" title={formatCurrency(cardsData.totalOrcado)}>{formatCurrency(cardsData.totalOrcado)}</div>
              </div>
              
              <div onClick={() => openDetalhe('Orçamentos Aprovados', cardsData.aprovadosArr)} className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Aprovado</span>
                  <CheckCircle size={18} className="text-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-black text-emerald-700 truncate" title={formatCurrency(cardsData.totalAprovado)}>{formatCurrency(cardsData.totalAprovado)}</div>
              </div>
              
              <div onClick={() => openDetalhe('Orçamentos em Negociação', cardsData.negociacaoArr)} className="group cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-amber-300 hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Negociação</span>
                  <TrendingUp size={18} className="text-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-black text-amber-700 truncate" title={formatCurrency(cardsData.totalNegociacao)}>{formatCurrency(cardsData.totalNegociacao)}</div>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
                  <DollarSign size={18} className="text-blue-500 opacity-80" />
                </div>
                <div className="text-2xl font-black text-slate-800 truncate" title={formatCurrency(cardsData.ticketMedio)}>{formatCurrency(cardsData.ticketMedio)}</div>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Aprovação</span>
                  <Target size={18} className="text-purple-500 opacity-80" />
                </div>
                <div className="text-2xl font-black text-slate-800">{Number(cardsData.taxa || 0).toFixed(1)}%</div>
              </div>
              
              <div onClick={() => openDetalhe('Volume Total', orcamentosFiltrados)} className="group cursor-pointer p-5 rounded-2xl border border-slate-700 shadow-md hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-slate-800 to-slate-900 text-white transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-300 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Volume</span>
                  <FileText size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{cardsData.qtd}</span>
                  <span className="text-sm font-medium text-slate-400">orçamentos</span>
                </div>
              </div>
            </div>

            {/* Linha 2: Funil e Saúde do Follow-up */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 xl:col-span-2 flex flex-col">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest"><BarChart2 size={20} className="text-indigo-500"/> Funil Comercial de Conversão</h3>
                <div className="px-2 flex-1 flex flex-col justify-center">
                  <FunnelGraphic data={funnel} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 flex flex-col">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest"><Activity size={20} className="text-rose-500"/> Saúde do Follow-up</h3>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div onClick={() => openDetalhe('Retornos Atrasados', rankings.followUp.atrasados)} className="group cursor-pointer hover:bg-rose-50 bg-white border-2 border-rose-100 hover:border-rose-300 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all">
                    <span className="text-3xl font-black text-rose-600 group-hover:scale-110 transition-transform">{rankings.followUp.atrasados.length}</span>
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mt-2">Atrasados</span>
                  </div>
                  <div onClick={() => openDetalhe('Retornos Hoje', rankings.followUp.hoje)} className="group cursor-pointer hover:bg-amber-50 bg-white border-2 border-amber-100 hover:border-amber-300 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all">
                    <span className="text-3xl font-black text-amber-600 group-hover:scale-110 transition-transform">{rankings.followUp.hoje.length}</span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-2">Hoje</span>
                  </div>
                  <div onClick={() => openDetalhe('Retornos nos Próximos 7 Dias', rankings.followUp.proximos)} className="group cursor-pointer hover:bg-blue-50 bg-white border-2 border-blue-100 hover:border-blue-300 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all">
                    <span className="text-3xl font-black text-blue-600 group-hover:scale-110 transition-transform">{rankings.followUp.proximos.length}</span>
                    <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-2">Próximos 7d</span>
                  </div>
                  <div onClick={() => openDetalhe('Oportunidades de Alta Prioridade', rankings.followUp.altaPrioArr)} className="group cursor-pointer hover:bg-orange-50 bg-white border-2 border-orange-100 hover:border-orange-300 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all">
                    <span className="text-3xl font-black text-orange-600 group-hover:scale-110 transition-transform">{rankings.followUp.altaPrioArr.length}</span>
                    <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider mt-2">Alta Priori.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 3: Rankings (Produtos, Clientes, Regiões) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest"><Package size={20} className="text-indigo-500"/> Top Produtos</h3>
                {rankings.topProdutos && rankings.topProdutos.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.topProdutos.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topProdutos[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 font-medium italic">Sem dados neste período</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest"><Users size={20} className="text-emerald-500"/> Top Clientes</h3>
                {rankings.topClientes && rankings.topClientes.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.topClientes.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topClientes[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 font-medium italic">Sem dados neste período</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest"><MapPin size={20} className="text-amber-500"/> Top Regiões</h3>
                {rankings.topRegioes && rankings.topRegioes.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.topRegioes.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topRegioes[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-xs text-slate-400 font-medium italic">Sem dados neste período</p>
                  </div>
                )}
              </div>

            </div>

            {/* Linha 4: Oportunidades para agir agora */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-widest"><AlertTriangle size={20} className="text-orange-500"/> Oportunidades para agir agora</h3>
              
              {agirAgora && agirAgora.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest rounded-tl-xl">Temp.</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Orçamento</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Retorno</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest rounded-tr-xl">Ação (Whats)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {agirAgora.map((orc, i) => (
                        <tr key={i} className="hover:bg-slate-50 group transition-colors">
                          <td className="py-3 px-4">
                            <div className={`p-2 rounded-xl inline-flex items-center justify-center shadow-sm ${
                              orc.temp === 'quente' ? 'bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 border border-rose-300' :
                              orc.temp === 'morna' ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 border border-amber-300' :
                              'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border border-blue-200'
                            }`} title={`Temperatura: ${orc.temp}`}>
                              {orc.temp === 'quente' ? <Flame size={18} strokeWidth={2.5} /> :
                               orc.temp === 'morna' ? <Sun size={18} strokeWidth={2.5} /> :
                               <Snowflake size={18} strokeWidth={2.5} />}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-slate-500">#{orc?.numero_sequencial || orc?.id?.slice(0,6)}</td>
                          <td className="py-3 px-4 font-black text-sm text-slate-800 max-w-[200px] truncate">{orc?.cliente || '-'}</td>
                          <td className="py-3 px-4 font-black text-sm text-slate-900 text-right">{formatCurrency(orc?.total)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                              orc.temp === 'quente' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                              orc.temp === 'morna' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                              'bg-white text-slate-600 border border-slate-200'
                            }`}>
                              {orc?.data_retorno ? String(orc.data_retorno).split('-').reverse().join('/') : 'Sem data'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 justify-between">
                              <span className="text-xs text-slate-500 font-medium truncate max-w-[150px] block" title={orc?.proxima_acao}>{orc?.proxima_acao || 'Nenhuma'}</span>
                              <button onClick={() => sendWhatsApp(orc)} className="flex items-center justify-center p-2 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-600 rounded-xl transition-all shadow-sm opacity-80 group-hover:opacity-100">
                                <MessageCircle size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                    <CheckCircle size={32} className="text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-black text-slate-700 mb-1">Tudo em dia!</h4>
                  <p className="text-sm text-slate-500 font-medium">Nenhuma oportunidade urgente no radar para os filtros selecionados.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
