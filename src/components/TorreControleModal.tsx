import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, BarChart2, DollarSign, Target, Activity, Users, MapPin, AlertTriangle, Calendar, Layers, CheckCircle, Package, FileText } from 'lucide-react';
import { supabase } from '../supabase';

interface TorreControleModalProps {
  onClose: () => void;
}

export function TorreControleModal({ onClose }: TorreControleModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState('Todos');

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

  // Filtragem
  const orcamentosFiltrados = useMemo(() => {
    const start = getStartDate();
    const lista = Array.isArray(orcamentos) ? orcamentos : [];
    if (!start) return lista;
    return lista.filter(o => o?.created_at && new Date(o.created_at) >= start);
  }, [orcamentos, periodo]);

  const solicitacoesFiltradas = useMemo(() => {
    const start = getStartDate();
    const lista = Array.isArray(solicitacoes) ? solicitacoes : [];
    if (!start) return lista;
    return lista.filter(s => s?.created_at && new Date(s.created_at) >= start);
  }, [solicitacoes, periodo]);

  // Cálculos de Cards
  const cards = useMemo(() => {
    let totalOrcado = 0;
    let totalAprovado = 0;
    let totalNegociacao = 0;
    let aprovadosCount = 0;

    (orcamentosFiltrados || []).forEach(o => {
      const val = Number(o?.total) || 0;
      totalOrcado += val;
      const status = o?.status || 'Aberto';
      if (status === 'Aprovado') {
        totalAprovado += val;
        aprovadosCount++;
      } else if (status === 'Aberto' || status === 'Enviado') {
        totalNegociacao += val;
      }
    });

    const taxa = orcamentosFiltrados.length > 0 ? (aprovadosCount / orcamentosFiltrados.length) * 100 : 0;
    const ticketMedio = aprovadosCount > 0 ? totalAprovado / aprovadosCount : 0;

    return {
      totalOrcado, totalAprovado, totalNegociacao, taxa, ticketMedio,
      qtd: orcamentosFiltrados.length
    };
  }, [orcamentosFiltrados]);

  // Cálculos de Rankings
  const rankings = useMemo(() => {
    const produtos: Record<string, { qtd: number; valor: number }> = {};
    const clientes: Record<string, { qtd: number; valor: number }> = {};
    const regioes: Record<string, { qtd: number; valor: number }> = {};
    
    const atrasados: any[] = [];
    const hoje: any[] = [];
    const proximos: any[] = [];
    const quentes: any[] = [];
    const altaPrioridadeCount = (orcamentosFiltrados || []).filter(o => o?.prioridade === 'Alta').length;

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
      if ((status === 'Aberto' || status === 'Enviado') && o?.data_retorno) {
        const retDate = new Date(o.data_retorno + 'T00:00:00');
        if (!isNaN(retDate.getTime())) {
          if (retDate < todayStart) atrasados.push(o);
          else if (retDate >= todayStart && retDate <= todayEnd) hoje.push(o);
          else if (retDate > todayEnd && retDate <= next7Days) proximos.push(o);
        }
      }

      // Oportunidades quentes: Alta prioridade + em negociação
      if ((status === 'Aberto' || status === 'Enviado') && o?.prioridade === 'Alta') {
        quentes.push(o);
      }
    });

    const sortRanking = (obj: Record<string, any>) => Object.entries(obj).sort((a, b) => b[1].valor - a[1].valor).slice(0, 5);

    return {
      topProdutos: sortRanking(produtos),
      topClientes: sortRanking(clientes),
      topRegioes: sortRanking(regioes),
      followUp: {
        atrasados: atrasados.length,
        hoje: hoje.length,
        proximos: proximos.length,
        altaPrioridade: altaPrioridadeCount
      },
      quentes: quentes.sort((a, b) => (Number(b?.total) || 0) - (Number(a?.total) || 0)).slice(0, 5)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white border-b border-slate-200 shadow-sm relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#1e293b] text-white rounded-xl shadow-md">
              <Activity size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1e293b] tracking-tight">Torre de Controle <span className="text-[#f97316]">FormaPlay</span></h2>
              <p className="text-sm text-slate-500 font-medium">Visão estratégica de orçamentos, oportunidades e desempenho comercial.</p>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <Calendar size={16} className="text-slate-500 ml-2" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-slate-700 py-1.5 pl-2 pr-8 focus:ring-0 cursor-pointer"
              >
                {['Todos', 'Hoje', 'Esta semana', 'Este mês', 'Este ano'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
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
        ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            
            {/* Linha 1: Cards Principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Layers size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Total Orçado</span>
                </div>
                <div className="text-xl font-black text-slate-800">{formatCurrency(cards.totalOrcado)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-emerald-500">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <CheckCircle size={16} className="text-emerald-500" /> <span className="text-xs font-bold uppercase tracking-wider">Aprovado</span>
                </div>
                <div className="text-xl font-black text-emerald-700">{formatCurrency(cards.totalAprovado)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between border-b-4 border-b-amber-500">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <TrendingUp size={16} className="text-amber-500" /> <span className="text-xs font-bold uppercase tracking-wider">Negociação</span>
                </div>
                <div className="text-xl font-black text-amber-700">{formatCurrency(cards.totalNegociacao)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <DollarSign size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Ticket Médio</span>
                </div>
                <div className="text-xl font-black text-indigo-700">{formatCurrency(cards.ticketMedio)}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Target size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Aprovação</span>
                </div>
                <div className="text-xl font-black text-slate-800">{Number(cards.taxa || 0).toFixed(1)}%</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <FileText size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Volume</span>
                </div>
                <div className="text-2xl font-black">{cards.qtd} <span className="text-xs font-normal text-slate-400">orçamentos</span></div>
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

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-1">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><Activity size={18} className="text-rose-500"/> Saúde do Follow-up</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-rose-600">{rankings.followUp.atrasados}</span>
                    <span className="text-[10px] font-bold text-rose-800 uppercase mt-1">Atrasados</span>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-amber-600">{rankings.followUp.hoje}</span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase mt-1">Hoje</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-blue-600">{rankings.followUp.proximos}</span>
                    <span className="text-[10px] font-bold text-blue-800 uppercase mt-1">Próximos 7d</span>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-orange-600">{rankings.followUp.altaPrioridade}</span>
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

            {/* Linha 4: Oportunidades Quentes */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider"><AlertTriangle size={18} className="text-orange-500"/> Oportunidades Quentes (Alta Prioridade)</h3>
              
              {rankings.quentes && rankings.quentes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 text-xs font-bold text-slate-500 uppercase">Cliente</th>
                        <th className="py-2 text-xs font-bold text-slate-500 uppercase">Valor</th>
                        <th className="py-2 text-xs font-bold text-slate-500 uppercase">Retorno</th>
                        <th className="py-2 text-xs font-bold text-slate-500 uppercase">Próxima Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.quentes.map((orc, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 pr-4 font-bold text-sm text-slate-800 max-w-[200px] truncate">{orc?.cliente || '-'}</td>
                          <td className="py-3 pr-4 font-black text-sm text-indigo-700">{formatCurrency(orc?.total)}</td>
                          <td className="py-3 pr-4 text-xs font-medium">
                            <span className={`px-2 py-1 rounded-md ${
                              orc?.data_retorno && !isNaN(new Date(orc.data_retorno + 'T00:00:00').getTime()) && new Date(orc.data_retorno + 'T00:00:00') < new Date(new Date().setHours(0,0,0,0))
                              ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {orc?.data_retorno ? String(orc.data_retorno).split('-').reverse().join('/') : 'Sem data'}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-600 italic truncate max-w-[300px]">{orc?.proxima_acao || 'Nenhuma ação registrada'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic py-4">Nenhuma oportunidade quente identificada neste período.</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
