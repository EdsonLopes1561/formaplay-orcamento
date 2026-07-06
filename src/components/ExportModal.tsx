import { useState } from 'react';
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
    <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in transition-opacity">
      <div className="bg-blue-950 rounded-3xl w-full max-w-2xl flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-blue-800/50 overflow-hidden text-slate-200">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hidden sm:block">
              <Download size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Central de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Exportação</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">Baixe relatórios e dados do sistema em CSV.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-blue-900 hover:bg-slate-700 hover:text-white transition-all border border-blue-800 text-slate-400 self-end sm:self-auto shadow-sm active:scale-95"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-950/30">
          <button
            onClick={() => handleExport('Orcamentos')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border border-blue-800 bg-blue-900/40 rounded-2xl hover:border-emerald-500/50 hover:bg-blue-900/60 transition-all text-left group shadow-lg hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3.5 bg-blue-600/20 text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              <FileSpreadsheet size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors truncate">Orçamentos</h3>
              <p className="text-xs text-slate-400 font-medium">Histórico completo de orçamentos.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Clientes')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border border-blue-800 bg-blue-900/40 rounded-2xl hover:border-emerald-500/50 hover:bg-blue-900/60 transition-all text-left group shadow-lg hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3.5 bg-emerald-600/20 text-emerald-400 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              <Users size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">Clientes</h3>
              <p className="text-xs text-slate-400 font-medium">Base de clientes cadastrados.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Solicitacoes')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border border-blue-800 bg-blue-900/40 rounded-2xl hover:border-emerald-500/50 hover:bg-blue-900/60 transition-all text-left group shadow-lg hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3.5 bg-amber-600/20 text-amber-400 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              <FileText size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-200 group-hover:text-amber-400 transition-colors truncate">Solicitações</h3>
              <p className="text-xs text-slate-400 font-medium">Pedidos vindos do site público.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('FollowUp')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border border-blue-800 bg-blue-900/40 rounded-2xl hover:border-emerald-500/50 hover:bg-blue-900/60 transition-all text-left group shadow-lg hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3.5 bg-purple-600/20 text-purple-400 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              <CalendarCheck size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-200 group-hover:text-purple-400 transition-colors truncate">Follow-up</h3>
              <p className="text-xs text-slate-400 font-medium">Apenas orçamentos em andamento.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Resumo')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border border-blue-800 bg-blue-900/40 rounded-2xl hover:border-emerald-500/50 hover:bg-blue-900/60 transition-all text-left group shadow-lg hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-pink-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="p-3.5 bg-pink-600/20 text-pink-400 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)]">
              <BarChart size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-200 group-hover:text-pink-400 transition-colors truncate">Resumo Comercial</h3>
              <p className="text-xs text-slate-400 font-medium">Métricas financeiras e de conversão.</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('Tudo')}
            disabled={loading}
            className="flex items-center gap-4 p-4 border border-emerald-500/50 bg-blue-900/60 rounded-2xl hover:bg-emerald-900/30 transition-all text-left group shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
            <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-xl group-hover:scale-105 transition-transform shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              <Layers size={24} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-emerald-400 truncate">Tudo completo</h3>
              <p className="text-xs text-slate-400 font-medium">Baixar todas as planilhas juntas.</p>
            </div>
          </button>
        </div>

        {loading && (
          <div className="px-6 pb-6 pt-2 text-center animate-pulse bg-blue-950/30">
            <div className="inline-flex items-center gap-2.5 bg-emerald-500/10 text-emerald-400 px-5 py-2.5 rounded-xl font-bold text-sm border border-emerald-500/20 shadow-inner">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              {loadingStatus}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-3">Serão baixados arquivos separados em CSV para cada categoria.</p>
          </div>
        )}
        
        {!loading && (
          <div className="px-6 pb-6 pt-2 text-center bg-blue-950/30">
            <p className="text-xs font-semibold text-slate-500">Os arquivos baixados possuem extensão .csv e podem ser abertos no Excel.</p>
          </div>
        )}

      </div>
    </div>
  );
}
