import { useState, useEffect } from 'react';
import { X, Clock, Trash2, Save, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '../supabase';
import { Orcamento } from '../types';
import { ETAPAS_TIMELINE } from '../constants/etapasTimeline';

interface EditorLinhaTempoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orcamento: Orcamento | null;
}

interface HistoricoItem {
  id: string;
  orcamento_id: string;
  status: string;
  data_status: string;
  observacao_publica: string | null;
  criado_em: string;
}

interface EtapaView {
  id: string;
  status: string;
  isNew: boolean;
  criado_em?: string;
  isFuture?: boolean;
}

export function EditorLinhaTempoModal({ isOpen, onClose, orcamento }: EditorLinhaTempoModalProps) {
  const normalizeStatus = (status: string) => {
    if (!status) return status;
    if (status === 'Aguardando pagamento ou autorização') return 'Aguardando pagamento/autorização de compra';
    if (status === 'Pagamento/autorização aprovado') return 'Pedido autorizado para produção';
    return status;
  };

  const [etapasList, setEtapasList] = useState<EtapaView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [editValues, setEditValues] = useState<Record<string, { data_status: string, observacao_publica: string }>>({});

  useEffect(() => {
    if (isOpen && orcamento) {
      loadHistorico();
    } else {
      setEtapasList([]);
      setEditValues({});
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, orcamento]);

  const loadHistorico = async () => {
    if (!orcamento) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.rpc('listar_historico_status_orcamento', {
        p_orcamento_id: orcamento.id
      });
      if (err) throw err;
      
      const historicoData: HistoricoItem[] = data || [];
      
      const list: EtapaView[] = [];
      const initialEdits: Record<string, { data_status: string, observacao_publica: string }> = {};

      const etapasBase = [...ETAPAS_TIMELINE];
      if (orcamento.status_acompanhamento === 'Cancelado' || historicoData.some(h => h.status === 'Cancelado')) {
        if (!etapasBase.includes('Cancelado')) etapasBase.push('Cancelado');
      }

      // Garante que etapas adicionais no histórico apareçam
      historicoData.forEach(h => {
        if (!etapasBase.includes(h.status) && !etapasBase.some(e => normalizeStatus(e) === normalizeStatus(h.status))) {
          etapasBase.push(h.status);
        }
      });

      const currentStatusNormalized = normalizeStatus(orcamento.status_acompanhamento || '');
      const currentIndex = ETAPAS_TIMELINE.indexOf(currentStatusNormalized);
      const isCancelado = currentStatusNormalized === 'Cancelado';

      etapasBase.forEach((etapa, index) => {
        const hItem = historicoData.find(h => normalizeStatus(h.status) === normalizeStatus(etapa) || h.status === etapa);
        
        // Define if this step is "future" based on the order's current status
        const isFuture = !isCancelado && currentIndex !== -1 && index > currentIndex;
        const isFutureIfCancelado = isCancelado && !hItem; 

        if (hItem) {
          list.push({ id: hItem.id, status: hItem.status, isNew: false, criado_em: hItem.criado_em, isFuture: false });
          initialEdits[hItem.id] = {
            data_status: formatForInput(hItem.data_status),
            observacao_publica: hItem.observacao_publica || ''
          };
        } else {
          const newId = `new_${etapa}`;
          list.push({ id: newId, status: etapa, isNew: true, isFuture: isFuture || isFutureIfCancelado });
          initialEdits[newId] = {
            data_status: formatForInput(new Date().toISOString()),
            observacao_publica: ''
          };
        }
      });
      
      setEtapasList(list);
      setEditValues(initialEdits);
      
    } catch (err: any) {
      setError('Erro ao carregar linha do tempo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleUpdate = async (item: EtapaView) => {
    const edits = editValues[item.id];
    if (!edits) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      const dataStatusDate = new Date(edits.data_status);
      if (isNaN(dataStatusDate.getTime())) throw new Error("Data inválida");
      
      const { error: err } = await supabase.rpc('atualizar_historico_status_orcamento', {
        p_id: item.id,
        p_data_status: dataStatusDate.toISOString(),
        p_observacao_publica: edits.observacao_publica.trim() || null
      });
      if (err) throw err;
      
      setSuccess('Etapa atualizada com sucesso!');
      loadHistorico();
    } catch (err: any) {
      setError('Erro ao atualizar etapa: ' + err.message);
    }
  };

  const handleAdd = async (item: EtapaView) => {
    const edits = editValues[item.id];
    if (!edits) return;
    
    setError(null);
    setSuccess(null);
    
    try {
      const dataStatusDate = new Date(edits.data_status);
      if (isNaN(dataStatusDate.getTime())) throw new Error("Data inválida");
      
      const { error: err } = await supabase.rpc('inserir_historico_status_orcamento', {
        p_orcamento_id: orcamento!.id,
        p_status: item.status,
        p_data_status: dataStatusDate.toISOString(),
        p_observacao_publica: edits.observacao_publica.trim() || null
      });
      
      if (err) {
        console.error('Erro ao adicionar etapa:', err);
        setError('Erro ao adicionar etapa: ' + err.message);
        return;
      }
      
      setSuccess('Etapa adicionada com sucesso!');
      await loadHistorico();
    } catch (err: any) {
      console.error('Exceção ao adicionar etapa:', err);
      setError('Erro ao adicionar etapa: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta etapa da linha do tempo? Esta ação não pode ser desfeita.")) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const { error: err } = await supabase.rpc('excluir_historico_status_orcamento', {
        p_id: id
      });
      if (err) throw err;
      setSuccess('Etapa excluída com sucesso!');
      loadHistorico();
    } catch (err: any) {
      setError('Erro ao excluir etapa: ' + err.message);
    }
  };

  const handleEditChange = (id: string, field: 'data_status' | 'observacao_publica', value: string) => {
    setEditValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  if (!isOpen || !orcamento) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-md animate-fade-in transition-opacity">
      <div className="bg-[#0f172a] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Modal header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-800 bg-[#0f172a] shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-indigo-400 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hidden sm:block">
              <Clock size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Editar Linha do Tempo</h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">Pedido #{orcamento.numero} — {orcamento.cliente || 'Cliente não informado'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 hover:text-white transition-all border border-slate-800 text-slate-400 self-end sm:self-auto"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="bg-amber-900/20 border-b border-amber-500/20 px-6 py-3 flex items-center gap-3 text-amber-200 text-sm font-medium">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <p>Use este editor para adicionar etapas perdidas, corrigir horários, observações ou remover lançamentos.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#0f172a] space-y-4">
          {error && (
            <div className="p-4 bg-rose-900/30 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-200 text-sm">
              <AlertTriangle size={18} className="text-rose-400 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 bg-emerald-900/30 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-200 text-sm">
              <CheckCircle size={18} className="text-emerald-400 mt-0.5" />
              <p>{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(79,70,229,0.5)]" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando linha do tempo...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {etapasList.map((item) => (
                <div key={item.id} className={`bg-slate-900/60 border ${item.isNew ? 'border-dashed border-slate-600 opacity-80 hover:opacity-100' : 'border-slate-800'} rounded-2xl p-5 flex flex-col md:flex-row gap-5 shadow-sm transition-opacity`}>
                  {/* Info Status (Read-only) */}
                  <div className="md:w-1/3 flex flex-col justify-start border-b md:border-b-0 md:border-r border-slate-800/80 pb-4 md:pb-0 md:pr-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status (Não editável)</span>
                    <span className="inline-block px-3 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-sm font-bold w-fit">
                      {normalizeStatus(item.status)}
                    </span>
                    {!item.isNew && item.criado_em && (
                      <span className="text-xs text-slate-500 mt-3">Criado em: {new Date(item.criado_em).toLocaleString('pt-BR')}</span>
                    )}
                    {item.isNew && (
                      <span className="text-xs text-amber-500/80 font-semibold mt-3 flex items-center gap-1">
                        <AlertTriangle size={12} /> Etapa ausente no histórico
                      </span>
                    )}
                  </div>
                  
                  {/* Editable Fields */}
                  <div className="md:w-2/3 flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Data e Hora da Etapa
                      </label>
                      <input
                        type="datetime-local"
                        value={editValues[item.id]?.data_status || ''}
                        onChange={(e) => handleEditChange(item.id, 'data_status', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Observação Pública
                      </label>
                      <textarea
                        rows={2}
                        value={editValues[item.id]?.observacao_publica || ''}
                        onChange={(e) => handleEditChange(item.id, 'observacao_publica', e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm resize-none placeholder-slate-600"
                        placeholder="Adicione uma observação pública (opcional)"
                      />
                    </div>
                    
                    <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-800/50">
                      {!item.isNew && (
                        <>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-4 py-2 text-rose-500 hover:text-rose-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all font-bold text-sm flex items-center gap-2 active:scale-95"
                          >
                            <Trash2 size={16} /> Excluir Etapa
                          </button>
                          <button
                            onClick={() => handleUpdate(item)}
                            className="px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-500 border border-indigo-500/50 rounded-xl transition-all font-bold text-sm shadow-[0_0_10px_rgba(79,70,229,0.3)] flex items-center gap-2 active:scale-95"
                          >
                            <Save size={16} /> Salvar Etapa
                          </button>
                        </>
                      )}
                      {item.isNew && !item.isFuture && (
                        <button
                          onClick={() => handleAdd(item)}
                          className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/50 rounded-xl transition-all font-bold text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-2 active:scale-95"
                        >
                          <Plus size={16} /> Adicionar Etapa
                        </button>
                      )}
                      {item.isNew && item.isFuture && (
                        <div className="px-3 py-2 border border-slate-700/50 bg-slate-800/30 rounded-xl text-slate-500 text-xs font-semibold flex items-center gap-2">
                          <Clock size={14} />
                          Disponível apenas quando o pedido avançar
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-5 border-t border-slate-800 bg-[#0f172a] flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-slate-300 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold text-sm shadow-sm active:scale-95"
          >
            Concluir
          </button>
        </div>
        
      </div>
    </div>
  );
}
