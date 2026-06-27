import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Users, FileText, CalendarCheck, BarChart, Layers } from 'lucide-react';
import { supabase } from '../supabase';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const formatCurrency = (val: any) => {
    const num = Number(val);
    if (isNaN(num) || !num) return '0,00';
    return num.toFixed(2).replace('.', ',');
  };

  const formatDate = (val: any) => {
    if (!val) return '';
    if (val.includes('T')) {
      const parts = val.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  const sanitizeField = (field: any) => {
    if (field === null || field === undefined) return '';
    return `"${String(field).replace(/"/g, '""')}"`;
  };

  const triggerDownload = (filename: string, csvContent: string) => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(`Erro ao buscar dados de ${table}:`, error);
      return [];
    }
    return data || [];
  };

  const generateOrcamentosCSV = (data: any[]) => {
    const headers = [
      'Número', 'Data', 'Cliente', 'CPF/CNPJ', 'Telefone', 'E-mail',
      'Endereço', 'Cidade/UF', 'Produto', 'Quantidade', 'Valor unitário',
      'Subtotal', 'Frete', 'Desconto', 'Total', 'Status', 'Prioridade',
      'Data de retorno', 'Próxima ação', 'Forma de pagamento',
      'Condições de pagamento', 'Informações complementares', 'Observação interna'
    ];
    const rows = data.map(orc => [
      orc.numero, orc.data_orcamento || formatDate(orc.created_at), orc.cliente,
      orc.cliente_documento, orc.telefone, orc.email, orc.cliente_endereco_completo || orc.cliente_logradouro,
      orc.cidade || orc.cliente_cidade ? `${orc.cidade || orc.cliente_cidade}/${orc.estado || orc.cliente_uf || ''}` : '',
      orc.produto, orc.quantidade, formatCurrency(orc.valor_unitario),
      formatCurrency(orc.subtotal), formatCurrency(orc.frete), formatCurrency(orc.desconto),
      formatCurrency(orc.total), orc.status || 'Aberto', orc.prioridade || 'Baixa',
      orc.data_retorno, orc.proxima_acao, orc.pagamento,
      orc.condicoes_pagamento, orc.informacoes_complementares, orc.observacao_interna
    ].map(sanitizeField).join(';'));
    return headers.join(';') + '\n' + rows.join('\n');
  };

  const generateClientesCSV = (data: any[]) => {
    const headers = [
      'Nome / Razão Social', 'Nome fantasia', 'CPF/CNPJ', 'Inscrição Estadual',
      'E-mail', 'Telefone/WhatsApp', 'CEP', 'Endereço', 'Número', 'Complemento',
      'Bairro', 'Cidade', 'Estado', 'Tipo de cliente'
    ];
    const rows = data.map(cli => [
      cli.nome || cli.razao_social, cli.nome_fantasia, cli.documento, cli.inscricao_estadual,
      cli.email, cli.telefone, cli.cep, cli.endereco, cli.numero, cli.complemento,
      cli.bairro, cli.cidade, cli.estado, cli.tipo_cliente
    ].map(sanitizeField).join(';'));
    return headers.join(';') + '\n' + rows.join('\n');
  };

  const generateSolicitacoesCSV = (data: any[]) => {
    const headers = [
      'Código da solicitação', 'Data', 'Nome', 'Telefone', 'E-mail',
      'Produto solicitado', 'Quantidade', 'Valor estimado',
      'Forma de pagamento informada', 'Endereço', 'Observações', 'Status da solicitação'
    ];
    const rows = data.map(sol => [
      sol.codigo, formatDate(sol.created_at), sol.nome_razao, sol.telefone, sol.email,
      sol.jogo_escolhido, sol.quantidade, formatCurrency(sol.total_estimado),
      sol.forma_pagamento, `${sol.endereco || ''}, ${sol.numero || ''} - ${sol.cidade || ''}/${sol.estado || ''}`,
      sol.observacoes_cliente, sol.status
    ].map(sanitizeField).join(';'));
    return headers.join(';') + '\n' + rows.join('\n');
  };

  const generateFollowUpCSV = (data: any[]) => {
    const headers = [
      'Número do orçamento', 'Cliente', 'Telefone', 'E-mail', 'Status',
      'Prioridade', 'Data de retorno', 'Próxima ação', 'Observação interna', 'Total do orçamento'
    ];
    // Filter active for followup
    const followups = data.filter(o => o.status === 'Aberto' || o.status === 'Enviado');
    const rows = followups.map(orc => [
      orc.numero, orc.cliente, orc.telefone, orc.email, orc.status || 'Aberto',
      orc.prioridade || 'Baixa', orc.data_retorno, orc.proxima_acao, orc.observacao_interna,
      formatCurrency(orc.total)
    ].map(sanitizeField).join(';'));
    return headers.join(';') + '\n' + rows.join('\n');
  };

  const generateResumoCSV = (data: any[]) => {
    const headers = [
      'Total orçado', 'Total aprovado', 'Total em negociação',
      'Quantidade total de orçamentos', 'Abertos', 'Enviados',
      'Aprovados', 'Recusados', 'Cancelados', 'Taxa de aprovação'
    ];
    let totalOrcamentos = 0;
    let abertos = 0;
    let enviados = 0;
    let aprovados = 0;
    let recusados = 0;
    let cancelados = 0;
    let valorTotalOrcado = 0;
    let valorTotalAprovado = 0;
    let valorNegociacao = 0;

    data.forEach(orc => {
      totalOrcamentos++;
      const status = orc.status || 'Aberto';
      const valor = Number(orc.total) || 0;
      valorTotalOrcado += valor;
      if (status === 'Aberto') { abertos++; valorNegociacao += valor; }
      else if (status === 'Enviado') { enviados++; valorNegociacao += valor; }
      else if (status === 'Aprovado') { aprovados++; valorTotalAprovado += valor; }
      else if (status === 'Recusado') { recusados++; }
      else if (status === 'Cancelado') { cancelados++; }
    });
    const taxa = totalOrcamentos > 0 ? ((aprovados / totalOrcamentos) * 100).toFixed(2) + '%' : '0%';
    const row = [
      formatCurrency(valorTotalOrcado), formatCurrency(valorTotalAprovado), formatCurrency(valorNegociacao),
      totalOrcamentos, abertos, enviados, aprovados, recusados, cancelados, taxa
    ].map(sanitizeField).join(';');
    
    return headers.join(';') + '\n' + row;
  };

  const handleExport = async (type: string) => {
    setLoading(true);
    setLoadingStatus('Buscando dados...');
    const dataStr = new Date().toISOString().split('T')[0];

    try {
      if (type === 'Orcamentos') {
        const data = await fetchTableData('orcamentos');
        triggerDownload(`FormaPlay-Orcamentos-${dataStr}.csv`, generateOrcamentosCSV(data));
      } else if (type === 'Clientes') {
        const data = await fetchTableData('clientes');
        triggerDownload(`FormaPlay-Clientes-${dataStr}.csv`, generateClientesCSV(data));
      } else if (type === 'Solicitacoes') {
        const data = await fetchTableData('solicitacoes_orcamento');
        triggerDownload(`FormaPlay-Solicitacoes-${dataStr}.csv`, generateSolicitacoesCSV(data));
      } else if (type === 'FollowUp') {
        const data = await fetchTableData('orcamentos');
        triggerDownload(`FormaPlay-FollowUp-${dataStr}.csv`, generateFollowUpCSV(data));
      } else if (type === 'Resumo') {
        const data = await fetchTableData('orcamentos');
        triggerDownload(`FormaPlay-Resumo-${dataStr}.csv`, generateResumoCSV(data));
      } else if (type === 'Tudo') {
        setLoadingStatus('Preparando exportação completa...');
        const orcamentos = await fetchTableData('orcamentos');
        const clientes = await fetchTableData('clientes');
        const solicitacoes = await fetchTableData('solicitacoes_orcamento');
        
        // Timeout prevents browser blocking multiple downloads if requested concurrently
        setTimeout(() => triggerDownload(`FormaPlay-Resumo-${dataStr}.csv`, generateResumoCSV(orcamentos)), 100);
        setTimeout(() => triggerDownload(`FormaPlay-Orcamentos-${dataStr}.csv`, generateOrcamentosCSV(orcamentos)), 400);
        setTimeout(() => triggerDownload(`FormaPlay-Clientes-${dataStr}.csv`, generateClientesCSV(clientes)), 700);
        setTimeout(() => triggerDownload(`FormaPlay-Solicitacoes-${dataStr}.csv`, generateSolicitacoesCSV(solicitacoes)), 1000);
        setTimeout(() => triggerDownload(`FormaPlay-FollowUp-${dataStr}.csv`, generateFollowUpCSV(orcamentos)), 1300);
      }
    } catch (err) {
      console.error('Erro na exportação', err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl border-t-4 border-indigo-600 animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Download size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Central de Exportação</h2>
              <p className="text-sm text-gray-500 font-medium">Baixe relatórios e dados do sistema em formato CSV.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleExport('Orcamentos')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-indigo-900">Orçamentos</h3>
              <p className="text-xs text-gray-500">Histórico completo de orçamentos.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Clientes')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Users size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-indigo-900">Clientes</h3>
              <p className="text-xs text-gray-500">Base de clientes cadastrados.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Solicitacoes')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-indigo-900">Solicitações</h3>
              <p className="text-xs text-gray-500">Pedidos vindos do site público.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('FollowUp')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CalendarCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-indigo-900">Follow-up</h3>
              <p className="text-xs text-gray-500">Apenas orçamentos em andamento.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Resumo')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
          >
            <div className="p-3 bg-pink-100 text-pink-600 rounded-lg group-hover:bg-pink-600 group-hover:text-white transition-colors">
              <BarChart size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-indigo-900">Resumo Comercial</h3>
              <p className="text-xs text-gray-500">Métricas financeiras e de conversão.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Tudo')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border-2 border-gray-900 bg-gray-900 rounded-xl hover:bg-gray-800 transition-all text-left group shadow-md"
          >
            <div className="p-3 bg-gray-700 text-white rounded-lg">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white">Tudo completo</h3>
              <p className="text-xs text-gray-400">Baixar todas as planilhas juntas.</p>
            </div>
          </button>
        </div>

        {loading && (
          <div className="px-6 pb-6 text-center animate-pulse">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full font-bold text-sm">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              {loadingStatus}
            </div>
            <p className="text-xs text-gray-500 mt-2">Serão baixados arquivos separados em CSV para cada categoria.</p>
          </div>
        )}
        
        {!loading && (
          <div className="px-6 pb-6 text-center">
            <p className="text-xs text-gray-400">Os arquivos baixados possuem extensão .csv e podem ser abertos no Excel.</p>
          </div>
        )}

      </div>
    </div>
  );
}
