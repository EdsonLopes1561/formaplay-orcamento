import React, { useMemo } from 'react';
import { 
  X, BarChart2, DollarSign, CheckCircle, 
  Clock, Send, XCircle, TrendingUp, AlertTriangle
} from 'lucide-react';
import { Orcamento } from '../types';

interface DashboardModalProps {
  orcamentos: Orcamento[];
  onClose: () => void;
}

export function DashboardModal({ orcamentos, onClose }: DashboardModalProps) {
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

    orcamentos.forEach(orc => {
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
  }, [orcamentos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          {/* Top Cards - Financial Values */}
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

        </div>
      </div>
    </div>
  );
}
