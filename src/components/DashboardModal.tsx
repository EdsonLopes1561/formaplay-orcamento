import React, { useMemo, useState } from 'react';
import { 
  X, BarChart2, DollarSign, CheckCircle, 
  Clock, Send, XCircle, TrendingUp, AlertTriangle, Download,
  Calendar, Filter, Phone, CheckSquare, MessageCircle
} from 'lucide-react';
import { Orcamento } from '../types';

interface DashboardModalProps {
  orcamentos: Orcamento[];
  onClose: () => void;
}

export function DashboardModal({ orcamentos, onClose }: DashboardModalProps) {
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

  const exportarCSV = () => {
    const headers = [
      'Número', 'Data', 'Cliente', 'Telefone', 'E-mail', 'Cidade/UF',
      'Produto', 'Quantidade', 'Valor Unitário', 'Subtotal', 'Frete',
      'Desconto', 'Total', 'Status', 'Prazo', 'Pagamento', 'Observações',
      'Prioridade', 'Próxima Ação', 'Data Retorno', 'Observação Interna'
    ];

    const formatNumber = (num: any) => {
      const parsed = Number(num);
      if (isNaN(parsed) || !parsed) return '0,00';
      return parsed.toFixed(2).replace('.', ',');
    };

    const rows = orcamentosFiltrados.map(orc => {
      return [
        orc.numero || '',
        orc.data_orcamento || '',
        orc.cliente || '',
        orc.telefone || '',
        orc.email || '',
        orc.cidade || '',
        orc.produto || '',
        orc.quantidade || 0,
        formatNumber(orc.valor_unitario),
        formatNumber(orc.subtotal),
        formatNumber(orc.frete),
        formatNumber(orc.desconto),
        formatNumber(orc.total),
        orc.status || 'Aberto',
        orc.prazo_entrega || '',
        orc.pagamento || '',
        orc.observacoes || '',
        orc.prioridade || 'Baixa',
        orc.proxima_acao || '',
        orc.data_retorno || '',
        orc.observacao_interna || ''
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(';');
    });

    const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `formaplay-orcamentos-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <BarChart2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard Comercial</h2>
              <p className="text-sm text-gray-500">Resumo de desempenho e métricas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-4 py-2 bg-[#217346] text-white rounded-lg hover:bg-[#1e6b41] active:scale-95 transition-all font-bold text-sm shadow-sm"
            >
              <Download size={18} />
              Exportar Planilha
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">

          {/* Filtros de Período */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-gray-500 font-semibold mr-2">
                <Calendar size={20} />
                <span>Período:</span>
              </div>
              
              {['Todos', 'Hoje', 'Esta Semana', 'Este Mês', 'Este Ano', 'Personalizado'].map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroPeriodo(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    filtroPeriodo === f
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {filtroPeriodo === 'Personalizado' && (
              <div className="flex items-center gap-4 mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm w-max animate-fade-in">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Data Inicial</label>
                  <input 
                    type="date" 
                    value={dataInicial} 
                    onChange={e => setDataInicial(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Data Final</label>
                  <input 
                    type="date" 
                    value={dataFinal} 
                    onChange={e => setDataFinal(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Revenue Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-gray-100 text-gray-600 rounded-full">
                <DollarSign size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orçado</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.valorTotalOrçado)}</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-green-100 text-green-600 rounded-full">
                <TrendingUp size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Aprovado</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.valorTotalAprovado)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                <Clock size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Em Negociação</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.valorNegociacao)}</p>
              </div>
            </div>
          </div>

          {/* Quantities and Status */}
          <h3 className="text-lg font-bold text-gray-900 mb-4">Volume de Orçamentos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <p className="text-3xl font-bold text-gray-900 mb-1">{metrics.totalOrçamentos}</p>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <div className="flex justify-center mb-2 text-gray-400"><Clock size={20} /></div>
              <p className="text-2xl font-bold text-gray-700 mb-1">{metrics.abertos}</p>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Abertos</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <div className="flex justify-center mb-2 text-blue-400"><Send size={20} /></div>
              <p className="text-2xl font-bold text-blue-700 mb-1">{metrics.enviados}</p>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Enviados</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <div className="flex justify-center mb-2 text-green-400"><CheckCircle size={20} /></div>
              <p className="text-2xl font-bold text-green-700 mb-1">{metrics.aprovados}</p>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Aprovados</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <div className="flex justify-center mb-2 text-red-400"><XCircle size={20} /></div>
              <p className="text-2xl font-bold text-red-700 mb-1">{metrics.recusados}</p>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Recusados</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
              <div className="flex justify-center mb-2 text-orange-400"><AlertTriangle size={20} /></div>
              <p className="text-2xl font-bold text-orange-700 mb-1">{metrics.cancelados}</p>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Cancelados</p>
            </div>
          </div>

          {/* Performance Rate */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Taxa de Aprovação</h3>
              <p className="text-sm text-gray-500">Porcentagem de orçamentos que foram aprovados</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-48 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${metrics.taxaAprovacao >= 50 ? 'bg-green-500' : 'bg-orange-500'}`}
                  style={{ width: `${metrics.taxaAprovacao}%` }}
                />
              </div>
              <span className="text-2xl font-bold text-gray-900 w-20 text-right">
                {metrics.taxaAprovacao.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Agenda de Follow-up */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Agenda de Follow-up</h3>
            </div>

            {/* Filtros da Agenda */}
            <div className="flex flex-wrap gap-2 mb-6">
              <div className="flex items-center gap-2 mr-2 text-gray-400">
                <Filter size={18} />
                <span className="text-sm font-semibold">Filtros:</span>
              </div>
              {['Todos', 'Atrasados', 'Hoje', 'Próximos 7 dias', 'Alta prioridade'].map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroAgenda(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    filtroAgenda === f
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {agenda.length === 0 ? (
                <div className="col-span-full py-10 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                  <CheckSquare size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-lg font-bold text-gray-500">Tudo limpo por aqui!</p>
                  <p className="text-gray-400">Nenhum follow-up encontrado para este filtro.</p>
                </div>
              ) : (
                agenda.map(orc => {
                  let badgePrio = 'bg-gray-100 text-gray-800';
                  if (orc.prioridade === 'Alta') badgePrio = 'bg-red-100 text-red-800';
                  if (orc.prioridade === 'Média') badgePrio = 'bg-orange-100 text-orange-800';

                  const isAtrasado = orc.data_retorno && orc.data_retorno < new Date().toISOString().split('T')[0];
                  
                  return (
                    <div key={orc.id || orc.numero} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-400 mb-1">{orc.numero} • {orc.status}</span>
                          <span className="font-bold text-gray-900 line-clamp-1">{orc.cliente || 'Cliente não informado'}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${badgePrio}`}>
                          {orc.prioridade || 'Baixa'}
                        </span>
                      </div>
                      
                      <div className="flex-1 space-y-3 mt-2">
                        {orc.data_retorno && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={16} className={isAtrasado ? 'text-red-500' : 'text-blue-500'} />
                            <span className={`font-semibold ${isAtrasado ? 'text-red-600' : 'text-gray-700'}`}>
                              Retorno: {orc.data_retorno.split('-').reverse().join('/')}
                              {isAtrasado && ' (Atrasado)'}
                            </span>
                          </div>
                        )}
                        
                        {orc.proxima_acao && (
                          <div className="flex items-start gap-2 text-sm bg-amber-50 p-2 rounded-lg border border-amber-100">
                            <CheckSquare size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <span className="text-amber-900 font-medium">{orc.proxima_acao}</span>
                          </div>
                        )}
                        
                        {orc.telefone && (
                          <button 
                            onClick={() => sendWhatsApp(orc)}
                            className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 w-full p-2.5 rounded-lg mt-3 transition-colors justify-center font-bold active:scale-95 shadow-sm"
                          >
                            <MessageCircle size={18} />
                            WhatsApp: {orc.telefone}
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
