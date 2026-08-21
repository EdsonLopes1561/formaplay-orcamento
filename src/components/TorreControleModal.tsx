import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, BarChart2, DollarSign, Target, Activity, Users, MapPin, AlertTriangle, Calendar, Layers, CheckCircle, Package, FileText, MessageCircle, ArrowLeft, Flame, Sun, Snowflake, Filter } from 'lucide-react';
import { supabase } from '../supabase';
import { FormaPlayBrand } from './FormaPlayBrand';
import { PresencaComercialView } from './PresencaComercial/PresencaComercialView';

interface TorreControleModalProps {
  onClose: () => void;
  onOpenDashboard?: () => void;
}

export function TorreControleModal({ onClose, onOpenDashboard }: TorreControleModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [visaoAtiva, setVisaoAtiva] = useState<'financeira' | 'comercial'>('financeira');
  
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

  const normalizeRegiaoKey = (raw: string) => {
    let s = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[´`']/g, "'");
    s = s.toLowerCase().replace(/\s+/g, ' ').trim();
    return s;
  };

  const getRegiaoRawData = (o: any) => {
    let rawCidade = String(o?.cidade || o?.cliente_cidade || '').trim();
    let rawEstado = String(o?.estado || o?.cliente_uf || '').trim().toUpperCase();

    if (rawCidade && rawCidade.toLowerCase() !== 'undefined' && rawCidade !== 'null') {
      rawCidade = rawCidade.replace(/[\/\-]+\s*$/, '').trim();
      
      const ufMatch = rawCidade.match(/[\/\-]\s*([A-Za-z]{2})$/);
      if (ufMatch) {
        rawCidade = rawCidade.replace(/[\/\-]\s*([A-Za-z]{2})$/, '').trim();
        if (!rawEstado) rawEstado = ufMatch[1].toUpperCase();
      }
    } else {
      return { raw: 'Não informado', key: 'nao informado' };
    }
    
    let key = normalizeRegiaoKey(rawCidade);
    if (rawEstado && rawEstado.length >= 2) {
      key = `${key}|${rawEstado.slice(0,2).toLowerCase()}`;
    }
    
    let display = rawCidade.replace(/\s+/g, ' ').trim();
    if (rawEstado && rawEstado.length >= 2) {
      display = `${display}/${rawEstado.slice(0,2).toUpperCase()}`;
    }
    
    return { raw: display, key };
  };

  // Valores Únicos para Comboboxes e Mapa Canônico de Regiões
  const { uniqueProdutos, uniqueCidades, canonicalMap } = useMemo(() => {
    const prods = new Set<string>();
    const regioesVariations = new Map<string, Set<string>>();

    (orcamentos || []).forEach(o => {
      const p = String(o?.produto || '').trim();
      if (p) prods.add(p);
      
      const reg = getRegiaoRawData(o);
      if (reg.key !== 'nao informado') {
        if (!regioesVariations.has(reg.key)) {
          regioesVariations.set(reg.key, new Set());
        }
        regioesVariations.get(reg.key)!.add(reg.raw);
      }
    });

    const map = new Map<string, string>();
    const cids = new Set<string>();

    const fixedCanonical: Record<string, string> = {
      'jau|sp': 'Jaú/SP',
      'sao paulo|sp': 'São Paulo/SP',
      'mogi guacu|sp': 'Mogi Guaçu/SP',
      "santa barbara d'oeste|sp": "Santa Bárbara d'Oeste/SP"
    };

    regioesVariations.forEach((variations, key) => {
      let canonical = '';
      if (fixedCanonical[key]) {
        canonical = fixedCanonical[key];
      } else {
        const arr = Array.from(variations);
        const withAccent = arr.find(v => /[áàâãéèêíïóôõöúçñ]/i.test(v));
        if (withAccent) {
          canonical = withAccent;
        } else {
          canonical = arr[0];
        }
      }
      map.set(key, canonical);
      cids.add(canonical);
    });

    return {
      uniqueProdutos: Array.from(prods).sort(),
      uniqueCidades: Array.from(cids).sort(),
      canonicalMap: map
    };
  }, [orcamentos]);

  const getRegiao = (o: any) => {
    const reg = getRegiaoRawData(o);
    if (reg.key === 'nao informado') return 'Não informado';
    return canonicalMap.get(reg.key) || reg.raw;
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
    let gerados = orcamentosFiltrados.length;
    let enviadosAcumulados = 0;
    let aprovados = 0;
    
    let statusCount = { aberto: 0, enviado: 0, aprovado: 0, cancelado: 0 };
    
    (orcamentosFiltrados || []).forEach(o => {
      const st = o?.status || 'Aberto';
      if (st === 'Enviado' || st === 'Aprovado' || st === 'Recusado') enviadosAcumulados++;
      if (st === 'Aprovado') aprovados++;
      
      if (st === 'Aberto') statusCount.aberto++;
      else if (st === 'Enviado') statusCount.enviado++;
      else if (st === 'Aprovado') statusCount.aprovado++;
      else if (st === 'Cancelado') statusCount.cancelado++;
    });
    
    return {
      solicitacoes: solicitacoesFiltradas.length, // Para métrica separada
      gerados,
      enviados: enviadosAcumulados,
      aprovados,
      statusCount
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
        <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1.5">
          <span className="truncate pr-2">{String(label)}</span>
          <span className="whitespace-nowrap font-bold text-white">{formatCurrency(safeValue)} {subValue && <span className="text-slate-500 font-medium ml-1">({subValue})</span>}</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800/50">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]" style={{ width: `${Math.min(percent, 100)}%` }}></div>
        </div>
      </div>
    );
  };

  const FunnelGraphic = ({ data }: { data: any }) => {
    // A barra base (100%) é sempre Gerados
    const baseGerados = Math.max(Number(data?.gerados) || 1, 1);
    
    const pEnviados = data.gerados > 0 ? ((data.enviados / data.gerados) * 100).toFixed(1).replace('.', ',') : '0,0';
    const pAprovados = data.enviados > 0 ? ((data.aprovados / data.enviados) * 100).toFixed(1).replace('.', ',') : '0,0';
    const pFinal = data.gerados > 0 ? ((data.aprovados / data.gerados) * 100).toFixed(1).replace('.', ',') : '0,0';

    const steps = [
      { 
        label: '1. Orçamentos Gerados', 
        value: Number(data?.gerados) || 0, 
        from: 'from-blue-600', to: 'to-blue-400', shadow: 'shadow-blue-500/20', 
        sub: <div><span className="text-blue-400 font-semibold">100%</span> <span className="text-slate-500">Base</span></div> 
      },
      { 
        label: '2. Orçamentos Enviados', 
        value: Number(data?.enviados) || 0, 
        from: 'from-indigo-600', to: 'to-indigo-400', shadow: 'shadow-indigo-500/20', 
        sub: <div><span className="text-indigo-400 font-semibold">{pEnviados}%</span> <span className="text-slate-500">dos orçamentos gerados foram enviados</span></div> 
      },
      { 
        label: '3. Orçamentos Aprovados', 
        value: Number(data?.aprovados) || 0, 
        from: 'from-emerald-600', to: 'to-emerald-400', shadow: 'shadow-emerald-500/30', 
        sub: (
          <div className="flex flex-col gap-0.5">
            <div><span className="text-emerald-400 font-semibold">{pFinal}%</span> <span className="text-slate-500">conversão geral</span></div>
            <div><span className="text-emerald-400 font-semibold">{pAprovados}%</span> <span className="text-slate-500">dos enviados foram aprovados</span></div>
          </div>
        )
      },
    ];
    
    return (
      <div className="flex flex-col h-full justify-between">
        <div className="flex flex-col gap-6 py-2">
          {steps.map((step, idx) => {
            const percent = Math.min((step.value / baseGerados) * 100, 100);
            return (
              <div key={idx} className="relative group">
                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{step.label}</span>
                    <div className="text-[13px] mt-1 tracking-wide">{step.sub}</div>
                  </div>
                  <span className="text-white font-black text-xl">{step.value}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800/50 mt-1 h-10 shadow-inner flex justify-start">
                  <div className={`bg-gradient-to-r ${step.from} ${step.to} h-full transition-all duration-700 ease-out group-hover:brightness-110 shadow-[inset_0_1px_rgba(255,255,255,0.2)] ${step.shadow}`} style={{ width: `${Math.max(percent, 0)}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/60 flex flex-col gap-4">
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex flex-col">
               <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Conversão Final</span>
               <span className="text-sm font-medium text-emerald-400/80">{data.aprovados} aprovados de {data.gerados} orçamentos gerados</span>
            </div>
            <span className="text-3xl font-black text-emerald-400">{pFinal}%</span>
          </div>

          <div className="text-center text-xs font-semibold text-slate-400 bg-slate-900/50 py-2.5 rounded-lg border border-slate-800/50">
             Situação atual: {data.statusCount?.aberto || 0} abertos &bull; {data.statusCount?.enviado || 0} enviados &bull; {data.statusCount?.aprovado || 0} aprovados &bull; {data.statusCount?.cancelado || 0} cancelados
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-[#0f172a] rounded-3xl w-full max-w-[1400px] max-h-[95vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800/50 overflow-hidden animate-fade-in text-slate-200">
        
        {/* Cabeçalho Premium Dark */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between p-6 bg-[#0f172a] border-b border-slate-800 shadow-sm relative z-10 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Activity size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight flex flex-col">
                <span>Torre de Controle</span>
                <span className="text-4xl -mt-1"><FormaPlayBrand /></span>
              </h2>
              <div className="flex flex-col gap-3 mt-0.5">
                <p className="text-sm text-slate-400 font-medium">Inteligência comercial e monitoramento estratégico.</p>
                <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-inner w-max">
                  <button 
                    onClick={() => setVisaoAtiva('financeira')}
                    className={`font-bold py-1 px-4 rounded-lg shadow-sm text-xs transition-all ${visaoAtiva === 'financeira' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    Visão Financeira
                  </button>
                  <button 
                    onClick={() => setVisaoAtiva('comercial')}
                    className={`font-bold py-1 px-4 rounded-lg shadow-sm text-xs transition-all ${visaoAtiva === 'comercial' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                    Presença Comercial
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!detalheVisivel && visaoAtiva === 'financeira' && (
              <div className="flex flex-wrap gap-2 justify-end mr-2">
                <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 transition-colors rounded-xl p-1.5 border border-slate-800 shadow-inner">
                  <Calendar size={16} className="text-emerald-400 ml-2" />
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-200 py-1 pl-2 pr-6 focus:ring-0 cursor-pointer outline-none">
                    {['Todos', 'Hoje', 'Esta semana', 'Este mês', 'Este ano'].map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 transition-colors rounded-xl p-1.5 border border-slate-800 shadow-inner">
                  <Filter size={14} className="text-slate-500 ml-2" />
                  <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-200 py-1 pl-2 pr-6 focus:ring-0 cursor-pointer outline-none">
                    <option value="Todos" className="bg-slate-900">Status (Todos)</option>
                    {['Aberto', 'Enviado', 'Aprovado', 'Recusado', 'Cancelado'].map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 transition-colors rounded-xl p-1.5 border border-slate-800 shadow-inner hidden sm:flex">
                  <select value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-200 py-1 px-3 focus:ring-0 cursor-pointer outline-none">
                    <option value="Todas" className="bg-slate-900">Prioridade (Todas)</option>
                    {['Baixa', 'Média', 'Alta'].map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 transition-colors rounded-xl p-1.5 border border-slate-800 shadow-inner hidden md:flex">
                  <select value={fProduto} onChange={(e) => setFProduto(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-200 py-1 px-3 focus:ring-0 cursor-pointer max-w-[140px] outline-none">
                    <option value="Todos" className="bg-slate-900">Produto (Todos)</option>
                    {uniqueProdutos.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>
                <div className="flex items-center bg-slate-900/80 hover:bg-slate-900 transition-colors rounded-xl p-1.5 border border-slate-800 shadow-inner hidden lg:flex">
                  <select value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="bg-transparent border-none text-xs font-bold text-slate-200 py-1 px-3 focus:ring-0 cursor-pointer max-w-[140px] outline-none">
                    <option value="Todas" className="bg-slate-900">Região (Todas)</option>
                    {uniqueCidades.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                  </select>
                </div>
              </div>
            )}
            {onOpenDashboard && (
              <button onClick={onOpenDashboard} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 transition-all border border-slate-800 text-blue-400 font-bold text-sm shadow-sm hover:border-blue-500/50">
                <BarChart2 size={18} strokeWidth={2.5} />
                <span className="hidden sm:inline">Dashboard Comercial</span>
              </button>
            )}

            <button onClick={onClose} className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 hover:text-white transition-all border border-slate-800 text-slate-400">
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] bg-slate-900/50">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-5 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Carregando painel...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-slate-900/50">
            <AlertTriangle size={56} className="text-rose-500 mb-5 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            <h3 className="text-2xl font-black text-white">Falha ao processar os dados.</h3>
            <p className="text-slate-400 mt-2 font-medium">Não foi possível carregar as informações no momento.</p>
          </div>
        ) : detalheVisivel ? (
          
          /* VISÃO DETALHADA (DRILL-DOWN) */
          <div className="flex-1 p-8 bg-slate-900/50 flex flex-col min-h-0 animate-fade-in">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={() => setDetalheVisivel(null)} className="flex items-center justify-center p-2.5 bg-slate-900 border border-slate-800 shadow-sm rounded-xl hover:bg-slate-700 hover:border-slate-500 hover:text-white transition-all text-slate-400 group">
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                  <h3 className="text-2xl font-black text-white">{tituloDetalhe}</h3>
                  <p className="text-sm font-medium text-emerald-400 mt-0.5">{detalheVisivel.length} orçamentos listados</p>
                </div>
              </div>
            </div>

            {detalheVisivel.length > 0 ? (
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 shadow-sm">
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Orçamento</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                        <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {detalheVisivel.map((orc, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-4 px-6 text-sm font-black text-slate-300">#{orc?.numero_sequencial || orc?.id?.slice(0,6)}</td>
                          <td className="py-4 px-6 text-sm font-bold text-slate-100">{orc?.cliente || 'Não informado'}</td>
                          <td className="py-4 px-6 text-xs font-bold">
                            <span className={`px-3 py-1.5 rounded-lg border ${
                              orc?.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              orc?.status === 'Enviado' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                              orc?.status === 'Recusado' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-slate-900 text-slate-400 border-slate-800'
                            }`}>
                              {orc?.status || 'Aberto'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-black text-emerald-400 text-right">{formatCurrency(orc?.total)}</td>
                          <td className="py-4 px-6 text-center">
                            <button onClick={() => sendWhatsApp(orc)} className="inline-flex text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/30 border border-emerald-500/20 p-2 rounded-xl transition-all shadow-sm" title="Chamar no WhatsApp">
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
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-[#0f172a] rounded-2xl border border-dashed border-slate-800">
                <AlertTriangle size={48} className="mb-4 opacity-50" />
                <p className="font-medium">Nenhum registro corresponde ao filtro atual.</p>
              </div>
            )}
          </div>
          
        ) : visaoAtiva === 'comercial' ? (
          <PresencaComercialView orcamentos={orcamentos} solicitacoes={solicitacoes} />
        ) : (
          
          /* VISÃO GERAL (CARDS & GRAFICOS) */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-slate-950/30">
            
            {/* Linha 1: Cards Principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
              
              <div onClick={() => openDetalhe('Total Orçado', orcamentosFiltrados)} className="group cursor-pointer bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:border-indigo-500/50 hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Orçado</span>
                  <Layers size={18} className="text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-black text-white truncate" title={formatCurrency(cardsData.totalOrcado)}>{formatCurrency(cardsData.totalOrcado)}</div>
              </div>
              
              <div onClick={() => openDetalhe('Orçamentos Aprovados', cardsData.aprovadosArr)} className="group cursor-pointer bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50 hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-emerald-400"></div>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Aprovado</span>
                  <CheckCircle size={18} className="text-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-black text-emerald-400 truncate drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]" title={formatCurrency(cardsData.totalAprovado)}>{formatCurrency(cardsData.totalAprovado)}</div>
              </div>
              
              <div onClick={() => openDetalhe('Orçamentos em Negociação', cardsData.negociacaoArr)} className="group cursor-pointer bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-500/50 hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-300"></div>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Negociação</span>
                  <TrendingUp size={18} className="text-amber-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-black text-amber-400 truncate" title={formatCurrency(cardsData.totalNegociacao)}>{formatCurrency(cardsData.totalNegociacao)}</div>
              </div>
              
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between relative overflow-hidden" title="Média do valor dos orçamentos aprovados">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400 opacity-50"></div>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider leading-tight">Ticket Médio<br/>Aprovado</span>
                  <DollarSign size={18} className="text-blue-400 opacity-60 shrink-0 ml-1" />
                </div>
                <div className="text-2xl font-black text-white truncate">{formatCurrency(cardsData.ticketMedio)}</div>
              </div>
              
              <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between relative overflow-hidden" title="Percentual de orçamentos gerados que foram aprovados">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-purple-400 opacity-50"></div>
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider leading-tight">Conversão<br/>Geral</span>
                  <Target size={18} className="text-purple-400 opacity-60 shrink-0 ml-1" />
                </div>
                <div className="text-2xl font-black text-white">{Number(cardsData.taxa || 0).toFixed(1).replace('.', ',')}%</div>
              </div>
              
              <div onClick={() => openDetalhe('Volume Total', orcamentosFiltrados)} className="group cursor-pointer p-5 rounded-2xl border border-slate-600 shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-1 bg-gradient-to-br from-slate-700 to-slate-800 text-white transition-all flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center justify-between text-slate-300 mb-3 relative z-10">
                  <span className="text-xs font-bold uppercase tracking-wider">Volume</span>
                  <FileText size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-3xl font-black">{cardsData.qtd}</span>
                  <span className="text-sm font-medium text-slate-400">orçamentos</span>
                </div>
              </div>
            </div>

            {/* Linha 2: Funil e Saúde do Follow-up */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              <div className="col-span-1 xl:col-span-2 flex flex-col gap-6">
                
                {/* Captação Independente */}
                <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                   <div>
                     <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest"><MapPin size={20} className="text-blue-500"/> Captação do Site</h3>
                     <p className="text-xs text-slate-500 mt-1 font-medium">Indicador independente de entrada de leads</p>
                   </div>
                   <div className="text-left sm:text-right">
                     <span className="text-3xl font-black text-white">{funnel.solicitacoes}</span>
                     <span className="text-sm font-medium text-slate-400 ml-1.5">solicitações recebidas</span>
                   </div>
                </div>

                {/* Funil de Orçamentos */}
                <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl flex-1 flex flex-col">
                  <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><BarChart2 size={20} className="text-emerald-500"/> Funil Comercial — Orçamentos</h3>
                  <div className="px-2 flex-1 flex flex-col justify-center">
                    <FunnelGraphic data={funnel} />
                  </div>
                </div>
                
              </div>

              <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl col-span-1 flex flex-col">
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><Activity size={20} className="text-rose-500"/> Follow-up Status</h3>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div onClick={() => openDetalhe('Retornos Atrasados', rankings.followUp.atrasados)} className="group cursor-pointer hover:bg-rose-500/10 bg-slate-900 border border-slate-800 hover:border-rose-500/50 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all shadow-inner">
                    <span className="text-3xl font-black text-rose-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] transition-all">{rankings.followUp.atrasados.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 group-hover:text-rose-300">Atrasados</span>
                  </div>
                  <div onClick={() => openDetalhe('Retornos Hoje', rankings.followUp.hoje)} className="group cursor-pointer hover:bg-amber-500/10 bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all shadow-inner">
                    <span className="text-3xl font-black text-amber-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all">{rankings.followUp.hoje.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 group-hover:text-amber-300">Hoje</span>
                  </div>
                  <div onClick={() => openDetalhe('Retornos nos Próximos 7 Dias', rankings.followUp.proximos)} className="group cursor-pointer hover:bg-blue-500/10 bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all shadow-inner">
                    <span className="text-3xl font-black text-blue-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all">{rankings.followUp.proximos.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 group-hover:text-blue-300">Próximos 7d</span>
                  </div>
                  <div onClick={() => openDetalhe('Oportunidades de Alta Prioridade', rankings.followUp.altaPrioArr)} className="group cursor-pointer hover:bg-orange-500/10 bg-slate-900 border border-slate-800 hover:border-orange-500/50 p-4 rounded-xl flex flex-col items-center justify-center text-center transition-all shadow-inner">
                    <span className="text-3xl font-black text-orange-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all">{rankings.followUp.altaPrioArr.length}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 group-hover:text-orange-300">Alta Priori.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 3: Rankings (Produtos, Clientes, Regiões) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><Package size={20} className="text-emerald-500"/> Top Produtos</h3>
                {rankings.topProdutos && rankings.topProdutos.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.topProdutos.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topProdutos[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                    <p className="text-xs text-slate-500 font-medium italic">Sem dados neste período</p>
                  </div>
                )}
              </div>

              <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><Users size={20} className="text-emerald-500"/> Top Clientes</h3>
                {rankings.topClientes && rankings.topClientes.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.topClientes.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topClientes[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                    <p className="text-xs text-slate-500 font-medium italic">Sem dados neste período</p>
                  </div>
                )}
              </div>

              <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl">
                <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><MapPin size={20} className="text-emerald-500"/> Top Regiões</h3>
                {rankings.topRegioes && rankings.topRegioes.length > 0 ? (
                  <div className="space-y-2">
                    {rankings.topRegioes.map(([name, data], idx) => (
                      <BarGraphic key={idx} label={name} value={data.valor} subValue={`${data.qtd} un.`} max={rankings.topRegioes[0][1]?.valor || 0} />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                    <p className="text-xs text-slate-500 font-medium italic">Sem dados neste período</p>
                  </div>
                )}
              </div>

            </div>

            {/* Linha 4: Oportunidades para agir agora */}
            <div className="bg-[#0f172a] p-6 rounded-2xl border border-slate-800 shadow-xl">
              <h3 className="text-sm font-black text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><AlertTriangle size={20} className="text-orange-500"/> Oportunidades para agir agora</h3>
              
              {agirAgora && agirAgora.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800">
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest rounded-tl-xl">Temp.</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Orçamento</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">Retorno</th>
                        <th className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest rounded-tr-xl">Ação (Whats)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {agirAgora.map((orc, i) => (
                        <tr key={i} className="hover:bg-slate-900/80 group transition-colors">
                          <td className="py-3 px-4">
                            <div className={`p-2 rounded-xl inline-flex items-center justify-center shadow-sm border ${
                              orc.temp === 'quente' ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]' :
                              orc.temp === 'morna' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                            }`} title={`Temperatura: ${orc.temp}`}>
                              {orc.temp === 'quente' ? <Flame size={18} strokeWidth={2.5} /> :
                               orc.temp === 'morna' ? <Sun size={18} strokeWidth={2.5} /> :
                               <Snowflake size={18} strokeWidth={2.5} />}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-bold text-slate-400">#{orc?.numero_sequencial || orc?.id?.slice(0,6)}</td>
                          <td className="py-3 px-4 font-black text-sm text-white max-w-[200px] truncate">{orc?.cliente || '-'}</td>
                          <td className="py-3 px-4 font-black text-sm text-emerald-400 text-right">{formatCurrency(orc?.total)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${
                              orc.temp === 'quente' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                              orc.temp === 'morna' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                              'bg-slate-900 text-slate-300 border-slate-800'
                            }`}>
                              {orc?.data_retorno ? String(orc.data_retorno).split('-').reverse().join('/') : 'Sem data'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 justify-between">
                              <span className="text-xs text-slate-400 font-medium truncate max-w-[150px] block" title={orc?.proxima_acao}>{orc?.proxima_acao || 'Nenhuma'}</span>
                              <button onClick={() => sendWhatsApp(orc)} className="flex items-center justify-center p-2 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/30 border border-emerald-500/20 hover:border-emerald-500/50 rounded-xl transition-all shadow-sm opacity-80 group-hover:opacity-100">
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
                <div className="flex flex-col items-center justify-center py-12 bg-[#0f172a] rounded-2xl border-2 border-dashed border-slate-800">
                  <div className="p-4 bg-slate-900 rounded-full shadow-sm mb-4 border border-slate-800">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-black text-white mb-1">Tudo em dia!</h4>
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

