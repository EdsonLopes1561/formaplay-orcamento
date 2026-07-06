import { useState } from 'react';
import { X, FileText, Trash2, AlertTriangle, Search, FolderOpen } from 'lucide-react';
import { Orcamento } from '../types';

interface HistoricoModalProps {
  orcamentos: Orcamento[];
  onClose: () => void;
  onCarregar: (orc: Orcamento) => void;
  onExcluir: (id: string) => void;
  onLimpar: () => void;
  loading: boolean;
}

export function HistoricoModal({
  orcamentos,
  onClose,
  onCarregar,
  onExcluir,
  onLimpar,
  loading,
}: HistoricoModalProps) {
  const fmt = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [dataInicial, setDataInicial] = useState<string>('');
  const [dataFinal, setDataFinal] = useState<string>('');

  const counts = {
    Todos: orcamentos.length,
    Aberto: orcamentos.filter(o => (o.status || 'Aberto') === 'Aberto').length,
    Enviado: orcamentos.filter(o => o.status === 'Enviado').length,
    Aprovado: orcamentos.filter(o => o.status === 'Aprovado').length,
    Recusado: orcamentos.filter(o => o.status === 'Recusado').length,
    Cancelado: orcamentos.filter(o => o.status === 'Cancelado').length,
  };

  const produtosUnicos = Array.from(new Set(orcamentos.map(o => o.produto).filter(Boolean)));

  const orcamentosFiltrados = orcamentos.filter(o => {
    if (filtroStatus !== 'Todos' && (o.status || 'Aberto') !== filtroStatus) return false;
    
    if (filtroProduto && o.produto !== filtroProduto) return false;

    if (dataInicial || dataFinal) {
      let oDateStr = o.created_at || '';
      if (!oDateStr && o.data_orcamento) {
        oDateStr = o.data_orcamento.split('/').reverse().join('-');
      }
      if (oDateStr) {
        const oDate = new Date(oDateStr);
        if (dataInicial && oDate < new Date(dataInicial + 'T00:00:00')) return false;
        if (dataFinal && oDate > new Date(dataFinal + 'T23:59:59')) return false;
      }
    }

    if (searchTerm) {
      const sanitize = (str?: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const st = sanitize(searchTerm);
      const match = (
        sanitize(o.numero).includes(st) ||
        sanitize(o.cliente).includes(st) ||
        sanitize(o.cliente_razao_social).includes(st) ||
        sanitize(o.cliente_documento).includes(st) ||
        sanitize(o.telefone).includes(st) ||
        sanitize(o.email).includes(st) ||
        sanitize(o.cidade).includes(st) ||
        sanitize(o.cliente_uf).includes(st) ||
        sanitize(o.produto).includes(st) ||
        sanitize(o.status || 'Aberto').includes(st)
      );
      if (!match) return false;
    }

    return true;
  });

  const limparFiltros = () => {
    setFiltroStatus('Todos');
    setSearchTerm('');
    setFiltroProduto('');
    setDataInicial('');
    setDataFinal('');
  };

  const getStatusBadge = (status: string | undefined) => {
    const s = status || 'Aberto';
    switch (s) {
      case 'Aprovado': return <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/30">{s}</span>;
      case 'Enviado': return <span className="bg-blue-500/20 text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-500/30">{s}</span>;
      case 'Recusado': return <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-rose-500/30">{s}</span>;
      case 'Cancelado': return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-slate-500/30">{s}</span>;
      default: return <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-amber-500/30">{s}</span>;
    }
  };

  const getPrioridadeBadge = (prioridade: string | undefined) => {
    const p = prioridade || 'Baixa';
    switch (p) {
      case 'Alta': return <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-rose-500/30">{p}</span>;
      case 'Média': return <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-orange-500/30">{p}</span>;
      case 'Baixa': return <span className="bg-slate-500/20 text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-slate-500/30">{p}</span>;
      default: return null;
    }
  };

  const inputClassName = "w-full px-4 py-2 bg-blue-900/50 border border-blue-800 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder-slate-500 text-sm";
  const labelClassName = "block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md animate-fade-in transition-opacity">
      <div className="bg-[#0f172a] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Modal header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-800 bg-[#0f172a] shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hidden sm:block">
              <FolderOpen size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Histórico de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Orçamentos</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">{orcamentos.length} orçamento(s) salvo(s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 hover:text-white transition-all border border-slate-800 text-slate-400 self-end sm:self-auto"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-5 bg-slate-900/80 border-b border-slate-800 space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por número, cliente, documento, telefone, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder-slate-500 shadow-inner"
              />
            </div>
            {(searchTerm || filtroStatus !== 'Todos' || filtroProduto || dataInicial || dataFinal) && (
              <button
                onClick={limparFiltros}
                className="px-5 py-3 text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
              >
                <X size={16} strokeWidth={2.5} /> Limpar
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className={labelClassName}>Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className={`${inputClassName} cursor-pointer !bg-slate-900 !border-slate-800`}
              >
                {Object.entries(counts).map(([key, count]) => (
                  <option key={key} value={key} className="bg-slate-900">{key} ({count})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Produto</label>
              <select
                value={filtroProduto}
                onChange={(e) => setFiltroProduto(e.target.value)}
                className={`${inputClassName} cursor-pointer !bg-slate-900 !border-slate-800`}
              >
                <option value="" className="bg-slate-900">Todos os produtos</option>
                {produtosUnicos.map(p => (
                  <option key={p} value={p} className="bg-slate-900">{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Data Inicial</label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className={`${inputClassName} !bg-slate-900 !border-slate-800`}
              />
            </div>
            <div>
              <label className={labelClassName}>Data Final</label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className={`${inputClassName} !bg-slate-900 !border-slate-800`}
              />
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-[#0f172a]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando...</p>
            </div>
          ) : orcamentosFiltrados.length === 0 ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
              <div className="p-4 bg-slate-900/80 rounded-full mb-4 border border-slate-800">
                <FileText size={48} className="opacity-50 text-slate-400" />
              </div>
              <p className="text-xl font-black text-white">Nenhum orçamento encontrado</p>
              <p className="text-sm mt-1 font-medium">Revise sua busca ou limpe os filtros para ver todos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {orcamentosFiltrados.map((orc) => (
                <div
                  key={orc.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg hover:border-emerald-500/50 hover:bg-slate-900/80 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center flex-shrink-0 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <FileText size={22} strokeWidth={2.5} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-black text-white text-lg group-hover:text-emerald-400 transition-colors">{orc.numero}</span>
                        {getStatusBadge(orc.status)}
                        {getPrioridadeBadge(orc.prioridade)}
                        <span className="text-slate-700 font-bold hidden sm:inline">•</span>
                        <span className="text-xs font-bold text-slate-400">{orc.data_orcamento}</span>
                      </div>
                      
                      <p className="font-bold text-slate-300 truncate text-sm mb-2">{orc.cliente || 'Cliente não informado'}</p>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-500 truncate">{orc.produto || 'Produto não informado'}</p>
                          {(orc.proxima_acao || orc.data_retorno) && (
                            <p className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/20 max-w-sm truncate" title={`${orc.proxima_acao} ${orc.data_retorno}`}>
                              <span className="font-bold">Follow-up:</span> {orc.proxima_acao} {orc.data_retorno && `(${orc.data_retorno})`}
                            </p>
                          )}
                        </div>
                        <span className="text-base sm:text-lg font-black text-emerald-400 mt-1 sm:mt-0">{fmt(orc.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800/50 justify-end">
                    <button
                      onClick={() => { onCarregar(orc); onClose(); }}
                      className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_10px_rgba(37,99,235,0.3)] border border-blue-500/50"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => orc.id && onExcluir(orc.id)}
                      className="p-2.5 bg-slate-900 text-rose-500 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-slate-800"
                      title="Excluir"
                    >
                      <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {orcamentos.length > 0 && (
          <div className="p-5 border-t border-slate-800 bg-[#0f172a] flex flex-col sm:flex-row justify-between items-center gap-3 relative z-10">
            <button
              onClick={onLimpar}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl transition-all font-bold text-sm shadow-sm active:scale-95"
            >
              <AlertTriangle size={18} strokeWidth={2.5} />
              Limpar Histórico
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold text-sm shadow-sm active:scale-95"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

