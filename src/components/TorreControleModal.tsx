import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, BarChart2, DollarSign, Target, Activity, Users, MapPin, AlertTriangle, Calendar, Layers, CheckCircle, Package, FileText, MessageCircle, ArrowLeft, Flame, Sun, Snowflake, Filter } from 'lucide-react';
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
      <div className="mb-3">
        <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
          <span className="truncate pr-2">{String(label)}</span>
          <span className="whitespace-nowrap font-bold text-gray-900">{formatCurrency(safeValue)} {subValue && <span className="text-gray-400 font-normal ml-1">({subValue})</span>}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(percent, 100)}%` }}></div>
        </div>
      </div>
    );
  };

  const FunnelGraphic = ({ data }: { data: any }) => {
    const max = Math.max(Number(data?.solicitacoes) || 0, Number(data?.orcamentos) || 0, Number(data?.enviados) || 0, Number(data?.aprovados) || 0, 1);
    const steps = [
      { label: 'Solicitações (Site)', value: Number(data?.solicitacoes) || 0, color: 'bg-blue-400' },
      { label: 'Orçamentos Gerados', value: Number(data?.orcamentos) || 0, color: 'bg-indigo-500' },
      { label: 'Orçamentos Enviados', value: Number(data?.enviados) || 0, color: 'bg-purple-500' },
      { label: 'Orçamentos Aprovados', value: Number(data?.aprovados) || 0, color: 'bg-emerald-500' },
    ];
    
    return (
      <div className="flex flex-col gap-3 py-2">
        {steps.map((step, idx) => (
          <div key={idx} className="relative">
            <div className="flex justify-between text-xs mb-1 font-medium text-gray-600">
              <span>{step.label}</span>
              <span className="font-bold">{step.value}</span>
            </div>
            <div className="w-full flex justify-center">
              <div className={`${step.color} h-6 rounded-md shadow-sm transition-all duration-500 ease-in-out`} style={{ width: `${Math.max((step.value / max) * 100, 5)}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-50 rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white border-b border-slate-200 shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#1e293b] text-white rounded-xl shadow-md">
              <Activity size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Torre de Controle <span className="text-[#f97316]">FormaPlay</span></h2>
              <p className="text-sm text-slate-500 font-medium">Visão analítica de orçamentos e inteligência comercial.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!detalheVisivel && (
              <div className="flex flex-wrap gap-2 justify-end mr-4">
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <Filter size={14} className="text-slate-500 ml-2" />
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 pl-2 pr-6 focus:ring-0 cursor-pointer">
                    {['Todos', 'Hoje', 'Esta semana', 'Este mês', 'Este ano'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                  <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-2 focus:ring-0 cursor-pointer">
                    <option value="Todos">Status (Todos)</option>
                    {['Aberto', 'Enviado', 'Aprovado', 'Recusado', 'Cancelado'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 hidden sm:flex">
                  <select value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-2 focus:ring-0 cursor-pointer">
                    <option value="Todas">Prioridade (Todas)</option>
                    {['Baixa', 'Média', 'Alta'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 hidden md:flex">
                  <select value={fProduto} onChange={(e) => setFProduto(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-2 focus:ring-0 cursor-pointer max-w-[120px]">
                    <option value="Todos">Produto (Todos)</option>
                    {uniqueProdutos.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 hidden lg:flex">
                  <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-700 py-1 px-2 focus:ring-0 cursor-pointer max-w-[120px]">
                    <option value="Todas">Região (Todas)</option>
                    {uniqueCidades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button onClick={onClose} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium text-sm">Carregando inteligência comercial...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <AlertTriangle size={48} className="text-rose-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800">Não foi possível carregar os dados da Torre de Controle.</h3>
            <p className="text-sm text-slate-500 mt-2">Por favor, verifique sua conexão ou tente novamente mais tarde.</p>
          </div>
        ) : detalheVisivel ? (
          
          /* VISÃO DETALHADA (DRILL-DOWN) */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setDetalheVisivel(null)} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="text-xl font-black text-slate-800">{tituloDetalhe} <span className="text-sm font-medium text-slate-500 ml-2">({detalheVisivel.length} orçamentos)</span></h3>
              </div>
            </div>

            {detalheVisivel.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Orçamento</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-right">Valor</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalheVisivel.map((orc, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-bold text-slate-700">#{orc?.numero_sequencial || orc?.id?.slice(0,6)}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">{orc?.cliente || 'Não informado'}</td>
                          <td className="py-3 px-4 text-xs font-medium">
                            <span className={`px-2 py-1 rounded-md ${
                              orc?.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                              orc?.status === 'Enviado' ? 'bg-blue-100 text-blue-700' :
                              orc?.status === 'Recusado' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {orc?.status || 'Aberto'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-black text-slate-800 text-right">{formatCurrency(orc?.total)}</td>
                          <td className="py-3 px-4">
                            <button onClick={() => sendWhatsApp(orc)} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-md transition-colors" title="Chamar no WhatsApp">
                              <MessageCircle size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <AlertTriangle size={48} className="mb-4 opacity-50" />
                <p>Nenhum dado encontrado para este detalhamento.</p>
              </div>
            )}
          </div>
          
        ) : (
          
          /* VISÃO GERAL (CARDS & GRAFICOS) */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            
            {/* Linha 1: Cards Principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div onClick={() => openDetalhe('Total Orçado', orcamentosFiltrados)} className="cursor-pointer hover:ring-2 hover:ring-indigo-400 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Layers size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Total Orçado</span>
                </div>
                <div className="text-xl font-black text-slate-800">{formatCurrency(cardsData.totalOrcado)}</div>
              </div>
              
              <div onClick={() => openDetalhe('Orçamentos Aprovados', cardsData.aprovadosArr)} className="cursor-pointer hover:ring-2 hover:ring-emerald-400 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-emerald-500 transition-all">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <CheckCircle size={16} className="text-emerald-500" /> <span className="text-xs font-bold uppercase tracking-wider">Aprovado</span>
                </div>
                <div className="text-xl font-black text-emerald-700">{formatCurrency(cardsData.totalAprovado)}</div>
              </div>
              
              <div onClick={() => openDetalhe('Orçamentos em Negociação', cardsData.negociacaoArr)} className="cursor-pointer hover:ring-2 hover:ring-amber-400 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-amber-500 transition-all">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <TrendingUp size={16} className="text-amber-500" /> <span className="text-xs font-bold uppercase tracking-wider">Negociação</span>
                </div>
                <div className="text-xl font-black text-amber-700">{formatCurrency(cardsData.totalNegociacao)}</div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <DollarSign size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
                </div>
                <div className="text-xl font-black text-indigo-700">{formatCurrency(cardsData.ticketMedio)}</div>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Target size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Aprovação</span>
                </div>
                <div className="text-xl font-black text-slate-800">{Number(cardsData.taxa || 0).toFixed(1)}%</div>
              </div>
              
              <div onClick={() => openDetalhe('Volume Total', orcamentosFiltrados)} className="cursor-pointer hover:ring-2 hover:ring-slate-400 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between bg-gradient-to-br from-slate-800 to-slate-900 text-white transition-all">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <FileText size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Volume</span>
                </div>
                <div className="text-2xl font-black">{cardsData.qtd} <span className="text-xs font-normal text-slate-400">orçamentos</span></div>
              </div>
            </div>

            {/* Linha 2: Funil e Saúde do Follow-up */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><BarChart2 size={18} className="text-indigo-600"/> Funil Comercial</h3>
                <div className="px-4">
                  <FunnelGraphic data={funnel} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1 flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><Activity size={18} className="text-rose-500"/> Saúde do Follow-up</h3>
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div onClick={() => openDetalhe('Retornos Atrasados', rankings.followUp.atrasados)} className="cursor-pointer hover:bg-rose-100 bg-rose-50 p-3 rounded-lg border border-rose-100 flex flex-col items-center justify-center text-center transition-colors">
                    <span className="text-2xl font-black text-rose-600">{rankings.followUp.atrasados.length}</span>
                    <span className="text-[10px] font-bold text-rose-800 uppercase mt-1">Atrasados</span>
                  </div>
                  <div onClick={() => openDetalhe('Retornos Hoje', rankings.followUp.hoje)} className="cursor-pointer hover:bg-amber-100 bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col items-center justify-center text-center transition-colors">
                    <span className="text-2xl font-black text-amber-600">{rankings.followUp.hoje.length}</span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase mt-1">Hoje</span>
                  </div>
                  <div onClick={() => openDetalhe('Retornos nos Próximos 7 Dias', rankings.followUp.proximos)} className="cursor-pointer hover:bg-blue-100 bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center transition-colors">
                    <span className="text-2xl font-black text-blue-600">{rankings.followUp.proximos.length}</span>
                    <span className="text-[10px] font-bold text-blue-800 uppercase mt-1">Próximos 7d</span>
                  </div>
                  <div onClick={() => openDetalhe('Oportunidades de Alta Prioridade', rankings.followUp.altaPrioArr)} className="cursor-pointer hover:bg-orange-100 bg-orange-50 p-3 rounded-lg border border-orange-100 flex flex-col items-center justify-center text-center transition-colors">
                    <span className="text-2xl font-black text-orange-600">{rankings.followUp.altaPrioArr.length}</span>
                    <span className="text-[10px] font-bold text-orange-800 uppercase mt-1">Alta Prioridade</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 3: Rankings (Produtos, Clientes, Regiões) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><Package size={18} className="text-indigo-500"/> Top Produtos (Por Valor)</h3>
                {rankings.topProdutos && rankings.topProdutos.length > 0 ? (
                  <div className="space-y-1">
                    {rankings.topProdutos.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topProdutos[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sem dados suficientes para este indicador.</p>
                )}
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><Users size={18} className="text-emerald-500"/> Top Clientes (Por Valor)</h3>
                {rankings.topClientes && rankings.topClientes.length > 0 ? (
                  <div className="space-y-1">
                    {rankings.topClientes.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topClientes[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sem dados suficientes para este indicador.</p>
                )}
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><MapPin size={18} className="text-amber-500"/> Top Regiões (Por Valor)</h3>
                {rankings.topRegioes && rankings.topRegioes.length > 0 ? (
                  <div className="space-y-1">
                    {rankings.topRegioes.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topRegioes[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sem dados suficientes para este indicador.</p>
                )}
              </div>

            </div>

            {/* Linha 4: Oportunidades para agir agora */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><AlertTriangle size={18} className="text-orange-500"/> Oportunidades para agir agora</h3>
              
              {agirAgora && agirAgora.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase rounded-tl-lg">Temp.</th>
                        <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Orçamento</th>
                        <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Cliente</th>
                        <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase text-right">Valor</th>
                        <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Retorno</th>
                        <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agirAgora.map((orc, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 group">
                          <td className="py-3 px-3">
                            <div className={`p-1.5 rounded-md inline-flex items-center justify-center ${
                              orc.temp === 'quente' ? 'bg-rose-100 text-rose-600' :
                              orc.temp === 'morna' ? 'bg-amber-100 text-amber-500' :
                              'bg-blue-100 text-blue-500'
                            }`} title={`Oportunidade ${orc.temp}`}>
                              {orc.temp === 'quente' ? <Flame size={16} /> :
                               orc.temp === 'morna' ? <Sun size={16} /> :
                               <Snowflake size={16} />}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-xs font-bold text-slate-600">#{orc?.numero_sequencial || orc?.id?.slice(0,6)}</td>
                          <td className="py-3 px-3 font-bold text-sm text-slate-800 max-w-[200px] truncate">{orc?.cliente || '-'}</td>
                          <td className="py-3 px-3 font-black text-sm text-indigo-700 text-right">{formatCurrency(orc?.total)}</td>
                          <td className="py-3 px-3 text-xs font-medium">
                            <span className={`px-2 py-1 rounded-md border ${
                              orc.temp === 'quente' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                              orc.temp === 'morna' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {orc?.data_retorno ? String(orc.data_retorno).split('-').reverse().join('/') : 'Sem data'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-xs text-slate-600 italic truncate max-w-[150px] block" title={orc?.proxima_acao}>{orc?.proxima_acao || 'Nenhuma'}</span>
                              <button onClick={() => sendWhatsApp(orc)} className="flex items-center gap-1 text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-600 px-2 py-1.5 rounded-md transition-all opacity-70 group-hover:opacity-100">
                                <MessageCircle size={14} /> <span className="text-[10px] font-bold uppercase hidden sm:inline">WhatsApp</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle size={32} className="text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Nenhuma oportunidade urgente no momento.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
