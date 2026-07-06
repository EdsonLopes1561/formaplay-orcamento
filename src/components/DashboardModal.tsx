import { useMemo, useState } from 'react';
import { 
  X, BarChart2, DollarSign, CheckCircle, 
  Clock, Send, XCircle, TrendingUp, AlertTriangle, Download,
  Calendar, Filter, CheckSquare, MessageCircle, Layers
} from 'lucide-react';
import { Orcamento } from '../types';

interface DashboardModalProps {
  orcamentos: Orcamento[];
  onClose: () => void;
}

export function DashboardModal({ orcamentos, onClose, onOpenExport }: DashboardModalProps & { onOpenExport?: () => void }) {
  const [filtroAgenda, setFiltroAgenda] = useState('Todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');

  const parseDataBrasileira = (dataStr: string | undefined, fallbackStr: string | undefined) => {
    const d = dataStr || fallbackStr || '';
    if (!d) return '';
    if (d.includes('-') && d.length >= 10) return d.substring(0, 10);
    const parts = d.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return '';
  };

  const orcamentosFiltrados = useMemo(() => {
    if (filtroPeriodo === 'Todos') return orcamentos;

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];

    const inicioMesStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const inicioAnoStr = `${hoje.getFullYear()}-01-01`;

    return orcamentos.filter(orc => {
      const dataIso = parseDataBrasileira(orc.data_orcamento, orc.created_at);
      if (!dataIso) return true;

      switch (filtroPeriodo) {
        case 'Hoje': return dataIso === hojeStr;
        case 'Esta Semana': return dataIso >= inicioSemanaStr && dataIso <= hojeStr;
        case 'Este Mês': return dataIso >= inicioMesStr && dataIso <= hojeStr;
        case 'Este Ano': return dataIso >= inicioAnoStr && dataIso <= hojeStr;
        case 'Personalizado':
          if (dataInicial && dataIso < dataInicial) return false;
          if (dataFinal && dataIso > dataFinal) return false;
          return true;
        default: return true;
      }
    });
  }, [orcamentos, filtroPeriodo, dataInicial, dataFinal]);

  const agenda = useMemo(() => {
    const ativos = orcamentos.filter(o => o.status === 'Aberto' || o.status === 'Enviado');
    const hojeStr = new Date().toISOString().split('T')[0];
    
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const limiteStr = nextWeekDate.toISOString().split('T')[0];

    const filtrados = ativos.filter(o => {
      if (filtroAgenda === 'Todos') return true;
      if (filtroAgenda === 'Alta prioridade') return o.prioridade === 'Alta';
      
      const dr = o.data_retorno;
      if (filtroAgenda === 'Atrasados') return dr && dr < hojeStr;
      if (filtroAgenda === 'Hoje') return dr === hojeStr;
      if (filtroAgenda === 'Próximos 7 dias') return dr && dr > hojeStr && dr <= limiteStr;
      return true;
    });

    return filtrados.sort((a, b) => {
      const da = a.data_retorno || '9999-99-99';
      const db = b.data_retorno || '9999-99-99';
      if (da < db) return -1;
      if (da > db) return 1;

      const pmap: Record<string, number> = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      const pa = pmap[a.prioridade || 'Baixa'] || 1;
      const pb = pmap[b.prioridade || 'Baixa'] || 1;
      return pb - pa;
    });
  }, [orcamentos, filtroAgenda]);

  const metrics = useMemo(() => {
    let totalOrçamentos = 0;
    let abertos = 0;
    let enviados = 0;
    let aprovados = 0;
    let recusados = 0;
    let cancelados = 0;

    let valorTotalOrçado = 0;
    let valorTotalAprovado = 0;
    let valorNegociacao = 0;

    orcamentosFiltrados.forEach(orc => {
      totalOrçamentos++;
      
      const status = orc.status || 'Aberto';
      const valor = Number(orc.total) || 0;

      valorTotalOrçado += valor;

      if (status === 'Aberto') {
        abertos++;
        valorNegociacao += valor;
      } else if (status === 'Enviado') {
        enviados++;
        valorNegociacao += valor;
      } else if (status === 'Aprovado') {
        aprovados++;
        valorTotalAprovado += valor;
      } else if (status === 'Recusado') {
        recusados++;
      } else if (status === 'Cancelado') {
        cancelados++;
      }
    });

    const taxaAprovacao = totalOrçamentos > 0 ? (aprovados / totalOrçamentos) * 100 : 0;

    return {
      totalOrçamentos,
      abertos,
      enviados,
      aprovados,
      recusados,
      cancelados,
      valorTotalOrçado,
      valorTotalAprovado,
      valorNegociacao,
      taxaAprovacao
    };
  }, [orcamentosFiltrados]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  const sendWhatsApp = (orc: Orcamento) => {
    if (!orc.telefone) return;
    let fone = String(orc.telefone).replace(/\D/g, '');
    if (!fone) return;
    if (!fone.startsWith('55')) {
      fone = '55' + fone;
    }

    const cli = orc.cliente || '';
    const prod = orc.produto || '';

    const msg = `Olá ${cli}, tudo bem? Aqui é o Edson da FormaPlay.\n\nEstou passando para saber se ficou alguma dúvida sobre o jogo educacional ${prod}.\n\nSerá um prazer te ajudar com as informações e, se fizer sentido, avançamos com a proposta.`;

    const textEncoded = encodeURIComponent(msg);
    const desktopUrl = `whatsapp://send?phone=${fone}&text=${textEncoded}`;
    const webUrl = `https://wa.me/${fone}?text=${textEncoded}`;

    window.location.href = desktopUrl;

    let fallbackTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        clearTimeout(fallbackTimeout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    fallbackTimeout = setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.open(webUrl, '_blank');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in transition-opacity">
      <div className="bg-blue-950 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-blue-800/50 overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-blue-600 to-blue-400 text-white rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hidden sm:block">
              <BarChart2 size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">Comercial</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">Resumo de desempenho e métricas de conversão</p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => {
                onClose();
                if (onOpenExport) onOpenExport();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 active:scale-95 transition-all font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500"
            >
              <Download size={18} strokeWidth={2.5} />
              Central de Exportação
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-blue-900 hover:bg-slate-700 hover:text-white transition-all border border-blue-800 text-slate-400 shadow-sm active:scale-95"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-blue-950/30">

          {/* Filtros de Período */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-slate-400 font-bold mr-2">
                <Calendar size={20} strokeWidth={2.5} />
                <span>Período:</span>
              </div>
              
              {['Todos', 'Hoje', 'Esta Semana', 'Este Mês', 'Este Ano', 'Personalizado'].map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroPeriodo(f)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                    filtroPeriodo === f
                      ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] border-blue-500'
                      : 'bg-blue-900/40 border-blue-800/50 text-slate-400 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {filtroPeriodo === 'Personalizado' && (
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 bg-blue-900/50 p-5 rounded-2xl border border-blue-800/50 shadow-sm w-max animate-fade-in">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Data Inicial</label>
                  <input 
                    type="date" 
                    value={dataInicial} 
                    onChange={e => setDataInicial(e.target.value)}
                    className="bg-blue-950 border border-blue-800 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 custom-date-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Data Final</label>
                  <input 
                    type="date" 
                    value={dataFinal} 
                    onChange={e => setDataFinal(e.target.value)}
                    className="bg-blue-950 border border-blue-800 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 custom-date-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-900/40 p-6 rounded-2xl border border-blue-800 shadow-lg flex items-center gap-5 hover:border-blue-700 transition-colors group">
              <div className="p-4 bg-blue-600/20 text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                <DollarSign size={28} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Orçado</p>
                <p className="text-2xl xl:text-3xl font-black text-white truncate">{formatCurrency(metrics.valorTotalOrçado)}</p>
              </div>
            </div>
            
            <div className="bg-blue-900/40 p-6 rounded-2xl border border-blue-800 shadow-lg flex items-center gap-5 hover:border-emerald-500/50 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="p-4 bg-emerald-600/20 text-emerald-400 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-inner relative z-10">
                <TrendingUp size={28} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Aprovado</p>
                <p className="text-2xl xl:text-3xl font-black text-emerald-400 truncate">{formatCurrency(metrics.valorTotalAprovado)}</p>
              </div>
            </div>

            <div className="bg-blue-900/40 p-6 rounded-2xl border border-blue-800 shadow-lg flex items-center gap-5 hover:border-amber-500/50 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="p-4 bg-amber-600/20 text-amber-400 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-inner relative z-10">
                <Clock size={28} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Em Negociação</p>
                <p className="text-2xl xl:text-3xl font-black text-amber-400 truncate">{formatCurrency(metrics.valorNegociacao)}</p>
              </div>
            </div>
          </div>

          {/* Quantities and Status */}
          <h3 className="text-xl font-black text-white mb-5 flex items-center gap-2">
            <Layers size={22} className="text-blue-500" />
            Volume de Orçamentos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg text-center relative overflow-hidden group hover:border-blue-600 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-3xl font-black text-white mb-1">{metrics.totalOrçamentos}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
            </div>
            
            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg text-center relative overflow-hidden group hover:border-amber-500/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-center mb-2 text-amber-500/80 group-hover:scale-110 transition-transform"><Clock size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-amber-400 mb-1">{metrics.abertos}</p>
              <p className="text-[10px] font-black text-amber-500/70 uppercase tracking-widest">Abertos</p>
            </div>

            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg text-center relative overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-center mb-2 text-blue-500/80 group-hover:scale-110 transition-transform"><Send size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-blue-400 mb-1">{metrics.enviados}</p>
              <p className="text-[10px] font-black text-blue-500/70 uppercase tracking-widest">Enviados</p>
            </div>

            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg text-center relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-center mb-2 text-emerald-500/80 group-hover:scale-110 transition-transform"><CheckCircle size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-emerald-400 mb-1">{metrics.aprovados}</p>
              <p className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">Aprovados</p>
            </div>

            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg text-center relative overflow-hidden group hover:border-rose-500/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-center mb-2 text-rose-500/80 group-hover:scale-110 transition-transform"><XCircle size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-rose-400 mb-1">{metrics.recusados}</p>
              <p className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest">Recusados</p>
            </div>

            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg text-center relative overflow-hidden group hover:border-slate-500/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-center mb-2 text-slate-500/80 group-hover:scale-110 transition-transform"><AlertTriangle size={20} strokeWidth={2.5} /></div>
              <p className="text-2xl font-black text-slate-400 mb-1">{metrics.cancelados}</p>
              <p className="text-[10px] font-black text-slate-500/70 uppercase tracking-widest">Cancelados</p>
            </div>
          </div>

          {/* Performance Rate */}
          <div className="bg-blue-900/40 p-6 rounded-2xl border border-blue-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none"></div>
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <TrendingUp size={22} className="text-emerald-500" />
                Taxa de Aprovação
              </h3>
              <p className="text-sm text-slate-400 font-medium mt-1">Porcentagem de orçamentos que foram convertidos em vendas</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-1/2 justify-end relative z-10">
              <div className="flex-1 max-w-xs h-4 bg-blue-950 border border-blue-900 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${metrics.taxaAprovacao >= 50 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
                  style={{ width: `${metrics.taxaAprovacao}%` }}
                />
              </div>
              <span className={`text-3xl font-black w-24 text-right tracking-tight ${metrics.taxaAprovacao >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metrics.taxaAprovacao.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Agenda de Follow-up */}
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-600/20 text-amber-400 rounded-xl shadow-inner border border-amber-500/20">
                <Calendar size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Agenda de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Follow-up</span></h3>
            </div>

            {/* Filtros da Agenda */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-2 mr-2 text-slate-400 font-bold">
                <Filter size={18} strokeWidth={2.5} />
                <span className="text-sm">Filtros:</span>
              </div>
              {['Todos', 'Atrasados', 'Hoje', 'Próximos 7 dias', 'Alta prioridade'].map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroAgenda(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 ${
                    filtroAgenda === f
                      ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] border-amber-500'
                      : 'bg-blue-900/40 border-blue-800/50 text-slate-400 hover:bg-blue-800 hover:text-white'
                  }`}
                >
                  {f === 'Atrasados' && '🚨 '}
                  {f === 'Hoje' && '🎯 '}
                  {f === 'Próximos 7 dias' && '📅 '}
                  {f === 'Alta prioridade' && '🔥 '}
                  {f}
                </button>
              ))}
            </div>

            {/* Lista da Agenda */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {agenda.length === 0 ? (
                <div className="col-span-full py-16 bg-blue-900/20 rounded-3xl border border-dashed border-blue-800 text-center flex flex-col items-center">
                  <div className="p-4 bg-blue-900/50 rounded-full mb-4 border border-blue-800">
                    <CheckSquare size={48} className="text-blue-500/50" />
                  </div>
                  <p className="text-xl font-black text-white">Tudo limpo por aqui!</p>
                  <p className="text-sm font-medium text-slate-400 mt-1">Nenhum follow-up encontrado para este filtro.</p>
                </div>
              ) : (
                agenda.map(orc => {
                  let badgePrio = 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                  if (orc.prioridade === 'Alta') badgePrio = 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
                  if (orc.prioridade === 'Média') badgePrio = 'bg-amber-500/20 text-amber-400 border-amber-500/30';

                  const isAtrasado = orc.data_retorno && orc.data_retorno < new Date().toISOString().split('T')[0];
                  
                  return (
                    <div key={orc.id || orc.numero} className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800 shadow-lg flex flex-col hover:border-blue-700 hover:bg-blue-900/60 transition-all group relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full opacity-50 group-hover:opacity-100 transition-opacity ${
                        isAtrasado ? 'bg-rose-500' : 'bg-blue-500'
                      }`}></div>
                      
                      <div className="flex justify-between items-start mb-4 pl-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 tracking-wider mb-1 uppercase">{orc.numero} • {orc.status}</span>
                          <span className="font-bold text-slate-200 line-clamp-1 text-lg group-hover:text-white transition-colors">{orc.cliente || 'Cliente não informado'}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${badgePrio}`}>
                          {orc.prioridade || 'Baixa'}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-3 mt-2 pl-2">
                        {orc.data_retorno && (
                          <div className="flex items-center gap-2.5 text-sm">
                            <Calendar size={16} strokeWidth={2.5} className={isAtrasado ? 'text-rose-500' : 'text-blue-500'} />
                            <span className={`font-semibold ${isAtrasado ? 'text-rose-400' : 'text-slate-300'}`}>
                              Retorno: {orc.data_retorno.split('-').reverse().join('/')}
                              {isAtrasado && ' (Atrasado)'}
                            </span>
                          </div>
                        )}
                        
                        {orc.proxima_acao && (
                          <div className="flex items-start gap-2.5 text-sm bg-blue-950/50 p-3 rounded-xl border border-blue-800/50 shadow-inner">
                            <CheckSquare size={16} strokeWidth={2.5} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <span className="text-amber-400 font-medium leading-relaxed">{orc.proxima_acao}</span>
                          </div>
                        )}
                        
                        {orc.telefone && (
                          <button 
                            onClick={() => sendWhatsApp(orc)}
                            className="flex items-center justify-center gap-2 text-sm text-[#25D366] bg-[#25D366]/10 border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white w-full p-2.5 rounded-xl mt-4 transition-all font-bold active:scale-95 shadow-sm"
                          >
                            <MessageCircle size={18} strokeWidth={2.5} />
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
