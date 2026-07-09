import React, { useState, useEffect } from 'react';
import { X, Save, CheckCircle, Package, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase.ts';
import { Orcamento } from '../types.ts';

interface ProducaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orcamento: Orcamento;
  orcamentoId: string | null;
  onSaved: (updatedOrcamento: Partial<Orcamento>) => void;
}

const CHECKLIST_ITEMS = [
  { id: 'caixa_tampa', label: 'Caixa tampa' },
  { id: 'caixa_fundo', label: 'Caixa fundo' },
  { id: 'tabuleiro', label: 'Tabuleiro' },
  { id: 'cartas_custos', label: 'Cartas CUSTOS' },
  { id: 'cartas_imprevistos', label: 'Cartas IMPREVISTOS' },
  { id: 'cartas_desafio', label: 'Cartas DESAFIO' },
  { id: 'cartas_eventos', label: 'Cartas EVENTOS' },
  { id: 'cartas_super_virada', label: 'Cartas SUPER VIRADA' },
  { id: 'dinheiro_jogo', label: 'Dinheiro do jogo' },
  { id: 'peoes_caminhoes', label: 'Peões caminhões' },
  { id: 'dado', label: 'Dado' },
  { id: 'manual', label: 'Manual / instruções' },
  { id: 'conferencia_quantidade', label: 'Conferência de quantidade' },
  { id: 'conferencia_visual', label: 'Conferência visual' },
  { id: 'embalagem_final', label: 'Embalagem final' },
  { id: 'nf_conferida', label: 'Nota fiscal conferida' },
  { id: 'pronto_envio', label: 'Pedido pronto para envio' }
];

const STATUS_OPTIONS = [
  'Não iniciada',
  'Em produção',
  'Em conferência',
  'Pronto para envio'
];

export const ProducaoModal: React.FC<ProducaoModalProps> = ({ isOpen, onClose, orcamento, orcamentoId, onSaved }) => {
  const [status, setStatus] = useState<string>('Não iniciada');
  const [observacao, setObservacao] = useState<string>('');
  const [prioridade, setPrioridade] = useState<string>('Normal');
  const [prazo, setPrazo] = useState<string>('');
  const [observacaoPrioridade, setObservacaoPrioridade] = useState<string>('');
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(orcamento.status_producao || 'Não iniciada');
      setObservacao(orcamento.observacao_producao || '');
      setPrioridade(orcamento.prioridade_producao || 'Normal');
      setPrazo(orcamento.prazo_producao || '');
      setObservacaoPrioridade(orcamento.observacao_prioridade || '');
      const parsedChecklist = Array.isArray(orcamento.producao_checklist) 
        ? orcamento.producao_checklist 
        : [];
      setCheckedItems(new Set(parsedChecklist));
      setError(null);
    }
  }, [isOpen, orcamento]);

  if (!isOpen) return null;

  const handleToggleItem = (id: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
  };

  const handleSave = async () => {
    if (!orcamentoId) {
      setError('Salve o orçamento antes de salvar a ordem de produção.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const arrayChecklist = Array.from(checkedItems);
      const agora = new Date().toISOString();
      
      const payload = {
        status_producao: status,
        producao_checklist: arrayChecklist,
        observacao_producao: observacao,
        producao_atualizado_em: agora,
        prioridade_producao: prioridade,
        prazo_producao: prazo || null,
        observacao_prioridade: observacaoPrioridade
      };

      const { error: sbError } = await supabase
        .from('orcamentos')
        .update(payload)
        .eq('id', orcamentoId);

      if (sbError) throw sbError;

      onSaved(payload);
    } catch (err: any) {
      console.error('Erro ao salvar ordem de produção:', err);
      setError('Não foi possível salvar o andamento da produção.');
    } finally {
      setSaving(false);
    }
  };

  const totalItems = CHECKLIST_ITEMS.length;
  const completedItems = checkedItems.size;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Package className="text-emerald-400" />
              Ordem de Produção
            </h2>
            <p className="text-sm font-medium text-slate-400 mt-1">
              FormaPlay — Jogos Educacionais
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200">
          {error && (
            <div className="mb-6 p-4 bg-red-900/40 border border-red-500/50 text-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Dados do Pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Pedido</p>
              <p className="font-black text-white">{orcamento.numero}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><User size={14} /> Cliente</p>
              <p className="font-bold text-slate-200 truncate" title={orcamento.cliente}>{orcamento.cliente}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Package size={14} /> Produto</p>
              <p className="font-bold text-slate-200 truncate" title={orcamento.produto}>{orcamento.produto} <span className="text-emerald-400">({orcamento.quantidade}x)</span></p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Clock size={14} /> Prazo</p>
              <p className="font-bold text-amber-400">{orcamento.prazo_entrega || 'Não definido'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Esquerda: Status e Obs */}
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
                <label className="block text-sm font-bold text-slate-300 mb-2">Status da Produção</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Comercial</p>
                  <p className="text-sm font-semibold text-blue-400">{orcamento.status}</p>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
                <h3 className="block text-sm font-bold text-slate-300 mb-4">Prioridade e Prazo Interno</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Prioridade de Produção</label>
                    <select
                      value={prioridade}
                      onChange={(e) => setPrioridade(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Alta">Alta</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Prazo Interno</label>
                    <input
                      type="date"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Observação de Prioridade</label>
                    <textarea
                      value={observacaoPrioridade}
                      onChange={(e) => setObservacaoPrioridade(e.target.value)}
                      placeholder="Ex: Cliente precisa para treinamento dia 20."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none h-20"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl">
                <label className="block text-sm font-bold text-slate-300 mb-2">Observações da Produção</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Anotações internas sobre separação, avarias ou embalagem..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none h-32"
                />
              </div>

              {orcamento.producao_atualizado_em && (
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <RefreshCw size={12} /> Última atualização: {new Date(orcamento.producao_atualizado_em).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            {/* Direita: Checklist */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl h-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={20} />
                    Checklist de Separação
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Progresso</p>
                      <p className="text-sm font-black text-white">{completedItems} de {totalItems} itens</p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-slate-800 flex items-center justify-center relative bg-slate-950">
                      <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 36 36">
                        <path
                          className="text-emerald-500"
                          strokeDasharray={`${progressPercent}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                      </svg>
                      <span className="text-[10px] font-black text-emerald-400">{progressPercent}%</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label 
                      key={item.id} 
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        checkedItems.has(item.id) 
                          ? 'bg-emerald-900/20 border-emerald-500/30 text-white' 
                          : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="pt-0.5 relative flex items-center">
                        <input
                          type="checkbox"
                          className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded bg-slate-900 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer focus:ring-0 focus:outline-none"
                          checked={checkedItems.has(item.id)}
                          onChange={() => handleToggleItem(item.id)}
                        />
                        <CheckCircle className="absolute left-0 top-0 w-5 h-5 text-slate-900 opacity-0 peer-checked:opacity-100 pointer-events-none p-0.5 transition-opacity" />
                      </div>
                      <span className={`font-medium select-none ${checkedItems.has(item.id) ? 'line-through opacity-80 text-emerald-100' : ''}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 rounded-b-2xl flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            disabled={saving}
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/50 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Salvar Andamento
          </button>
        </div>
      </div>
    </div>
  );
};
