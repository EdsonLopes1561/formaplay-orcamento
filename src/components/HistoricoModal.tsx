import { X, FileText, Trash2, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border-t-4 border-green-500">
        {/* Modal header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 bg-gradient-to-r from-blue-50 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Histórico de Orçamentos</h2>
            <p className="text-sm text-gray-500 mt-0.5">{orcamentos.length} orçamento(s) salvo(s)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orcamentos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-bold">Nenhum orçamento salvo</p>
              <p className="text-sm">Salve um orçamento para vê-lo aqui</p>
            </div>
          ) : (
            orcamentos.map((orc) => (
              <div
                key={orc.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-white border-l-4 border-green-500 shadow-sm hover:shadow-md hover:border-blue-600 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 text-white">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-green-700 text-base">{orc.numero}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs font-semibold text-gray-500">{orc.data_orcamento}</span>
                  </div>
                  <p className="font-bold text-gray-900 truncate">{orc.cliente || 'Cliente não informado'}</p>
                  <div className="flex justify-between items-start mt-2">
                    <p className="text-sm text-gray-600">{orc.produto || 'Produto não informado'}</p>
                    <span className="text-sm font-black text-green-700">{fmt(orc.total)}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { onCarregar(orc); onClose(); }}
                    className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all active:scale-95 shadow-sm"
                  >
                    Carregar
                  </button>
                  <button
                    onClick={() => orc.id && onExcluir(orc.id)}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {orcamentos.length > 0 && (
          <div className="p-5 border-t-2 border-gray-200 bg-gray-50 flex justify-between items-center gap-3">
            <button
              onClick={onLimpar}
              className="flex items-center gap-2 px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all font-bold text-sm shadow-md active:scale-95"
            >
              <AlertTriangle size={18} />
              Limpar Histórico
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-all font-bold text-sm shadow-md active:scale-95"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
