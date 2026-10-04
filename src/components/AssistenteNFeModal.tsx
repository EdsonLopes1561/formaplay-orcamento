import { useState, useMemo } from 'react';
import { 
  X, Copy, ExternalLink, CheckCircle, Receipt, User, 
  Package, FileText, AlertTriangle, CreditCard, Info
} from 'lucide-react';
import { Orcamento } from '../types';
import { normalizarItensOrcamento } from '../utils/orcamentoItens';
import { calcularVolumesMultiProdutos } from '../config/produtosLogisticos';

interface AssistenteNFeModalProps {
  orcamento: Partial<Orcamento>;
  onClose: () => void;
}

export function AssistenteNFeModal({ orcamento, onClose }: AssistenteNFeModalProps) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = (texto: string | number | undefined | null, id: string) => {
    if (!texto) return;
    navigator.clipboard.writeText(String(texto));
    setCopiado(id);
    setTimeout(() => setCopiado(null), 2000);
  };

  const fmtCurrency = (val: number | undefined | null) =>
    (Number(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── 1. DADOS DO DESTINATÁRIO ──────────────────────────────────────────────
  const razaoOuNome = orcamento.cliente_razao_social || orcamento.cliente_nome || orcamento.cliente || '';
  const documento = orcamento.cliente_documento || '';
  const ie = orcamento.cliente_inscricao_estadual || '';
  const email = orcamento.cliente_email || orcamento.email || '';
  const telefone = orcamento.cliente_telefone || orcamento.telefone || '';
  const cep = orcamento.cliente_cep || '';
  const logradouro = orcamento.cliente_logradouro || '';
  const numero = orcamento.cliente_numero || '';
  const complemento = orcamento.cliente_complemento || '';
  const bairro = orcamento.cliente_bairro || '';
  const cidade = orcamento.cliente_cidade || (orcamento.cidade ? orcamento.cidade.split('/')[0] : '') || '';
  const uf = (orcamento.cliente_uf || (orcamento.cidade ? orcamento.cidade.split('/')[1] : '') || '').trim().toUpperCase();

  // Lógica blindada do Indicador da IE (Sugestão sem decisão automática indevida)
  const cleanDoc = documento.replace(/\D/g, '');
  const isPJ = cleanDoc.length === 14;
  const isPF = cleanDoc.length === 11 || (!isPJ && cleanDoc.length > 0);
  const temIE = Boolean(ie && ie.trim() !== '' && ie.toLowerCase() !== 'isento' && ie.toLowerCase() !== 'não informado');

  let indicadorIESugerido = 'Confirmar no emissor: 2 - Isento ou 9 - Não Contribuinte';
  let indicadorIEBadge = '⚠ Confirmar no Emissor';
  let indicadorIEDescricao = 'PJ sem IE informada: verificar se é Isenta (opção 2) ou Não Contribuinte (opção 9)';

  if (isPF) {
    indicadorIESugerido = '9 - Não Contribuinte (Pessoa Física)';
    indicadorIEBadge = '⚠ Sugestão (PF)';
    indicadorIEDescricao = 'Pessoa Física é por padrão Não Contribuinte de ICMS';
  } else if (isPJ && temIE) {
    indicadorIESugerido = '1 - Contribuinte ICMS';
    indicadorIEBadge = '⚠ Sugestão (Com IE)';
    indicadorIEDescricao = 'Pessoa Jurídica com Inscrição Estadual informada';
  } else if (isPJ && !temIE) {
    indicadorIESugerido = 'Confirmar no emissor: 2 - Isento ou 9 - Não Contribuinte';
    indicadorIEBadge = '⚠ Confirmar no Emissor';
    indicadorIEDescricao = 'PJ sem IE informada: verificar se é Isenta (opção 2) ou Não Contribuinte (opção 9)';
  }

  // ── 2. PRODUTOS & RATEIO ──────────────────────────────────────────────────
  const itens = useMemo(() => normalizarItensOrcamento(orcamento), [orcamento]);
  
  const subtotalProdutos = useMemo(() => {
    return itens.reduce((sum, it) => sum + (it.subtotal || (it.quantidade * it.valor_unitario)), 0);
  }, [itens]);

  const freteTotal = Number(orcamento.frete) || 0;
  const descontoTotal = Number(orcamento.desconto) || 0;
  const totalNF = Number(orcamento.total) || Math.max(0, subtotalProdutos + freteTotal - descontoTotal);

  const itensComRateio = useMemo(() => {
    return itens.map(item => {
      const itemSubtotal = item.subtotal || (item.quantidade * item.valor_unitario);
      const proporcao = subtotalProdutos > 0 ? (itemSubtotal / subtotalProdutos) : (1 / Math.max(1, itens.length));
      const freteRateado = freteTotal * proporcao;
      const descontoRateado = descontoTotal * proporcao;
      const totalItem = Math.max(0, itemSubtotal + freteRateado - descontoRateado);
      return {
        ...item,
        itemSubtotal,
        freteRateado,
        descontoRateado,
        totalItem
      };
    });
  }, [itens, subtotalProdutos, freteTotal, descontoTotal]);

  // ── 3. SUGESTÕES FISCAIS (Não definitivas e não persistidas) ───────────────
  const isMesmaUF = uf === 'SP';
  const cfopSugerido = isMesmaUF ? '5101 ou 5102' : '6101 ou 6102';
  const cfopDescricao = isMesmaUF 
    ? 'Operação interna em SP — Confirmar se 5101 (produção própria) ou 5102 (revenda de mercadoria).' 
    : 'Operação interestadual fora de SP — Confirmar se 6101 (produção própria) ou 6102 (revenda de mercadoria).';

  const ncmSugerido = '9504.90.90';
  const origemSugerida = '0 - Nacional';
  const csosnSugerido = '102 - Tributada pelo Simples Nacional sem permissão de crédito';
  const cstPisCofins = '99 - Outras Operações (ou 49)';

  const modalidadeFreteSugerida = freteTotal > 0 ? '0 - Contratação por conta do Remetente (CIF)' : '9 - Sem Ocorrência de Transporte';
  const naturezaOperacaoSugerida = 'Venda de produção do estabelecimento';

  // ── 4. PAGAMENTO & TRANSPORTE ─────────────────────────────────────────────
  const formaPagamentoLower = (orcamento.pagamento || '').toLowerCase();
  
  const getDeParaPagamento = (forma: string) => {
    if (forma.includes('pix')) return { codigo: '17', label: '17 - Pagamento Instantâneo (PIX)', tipo: 'À Vista' };
    if (forma.includes('boleto')) return { codigo: '15', label: '15 - Boleto Bancário', tipo: 'Boleto' };
    if (forma.includes('cartão de crédito') || forma.includes('credito') || forma.includes('cartao')) return { codigo: '03', label: '03 - Cartão de Crédito', tipo: 'Cartão' };
    if (forma.includes('débito') || forma.includes('debito')) return { codigo: '04', label: '04 - Cartão de Débito', tipo: 'À Vista' };
    if (forma.includes('depósito') || forma.includes('deposito') || forma.includes('transferência') || forma.includes('ted')) return { codigo: '16', label: '16 - Depósito Bancário', tipo: 'À Vista' };
    if (forma.includes('dinheiro')) return { codigo: '01', label: '01 - Dinheiro', tipo: 'À Vista' };
    return { codigo: '99', label: '99 - Outros', tipo: 'Outro' };
  };

  const pagtoSefaz = getDeParaPagamento(formaPagamentoLower);

  // Volumes e Pesos
  const volumesCalculados = useMemo(() => {
    try {
      const vols = calcularVolumesMultiProdutos(itens, []);
      if (vols && vols.length > 0) {
        const totalVols = vols.length;
        const pesoTot = vols.reduce((sum, v) => sum + (v.peso || 0), 0);
        return {
          volumes: totalVols,
          pesoLiquido: Number(pesoTot.toFixed(3)),
          pesoBruto: Number((pesoTot * 1.08).toFixed(3))
        };
      }
    } catch {
      // Fallback
    }
    const totalQtd = itens.reduce((sum, it) => sum + it.quantidade, 0);
    const pesoLiq = itens.reduce((sum, it) => sum + ((it.peso_kg || 2.0) * it.quantidade), 0);
    return {
      volumes: Math.max(1, Math.ceil(totalQtd / 10)),
      pesoLiquido: Number(pesoLiq.toFixed(3)),
      pesoBruto: Number((pesoLiq * 1.08).toFixed(3))
    };
  }, [itens]);

  // ── 5. TEXTOS DA NF (Separados: sugestão tributária vs referência comercial)
  const textoSimplesNacional = "DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS.";
  const textoObservacaoPedido = `Referente ao Orçamento FormaPlay Nº ${orcamento.numero || 'S-N'}. Jogo Educacional Desafio Logístico.`;
  const textoInfCplCompleto = `${textoSimplesNacional} ${textoObservacaoPedido}`;

  // ── FUNÇÕES DE CÓPIA EM BLOCO ─────────────────────────────────────────────
  const copiarDadosCliente = () => {
    const texto = [
      `Razão Social / Nome: ${razaoOuNome}`,
      `CPF/CNPJ: ${documento}`,
      `Indicador IE (Sugestão): ${indicadorIESugerido}`,
      `Inscrição Estadual: ${ie || 'Não informada / Isento'}`,
      `E-mail: ${email || 'Não informado'}`,
      `Telefone: ${telefone || 'Não informado'}`,
      `CEP: ${cep}`,
      `Logradouro: ${logradouro}, ${numero || 'S/N'} ${complemento ? '- ' + complemento : ''}`,
      `Bairro: ${bairro}`,
      `Município: ${cidade}/${uf}`,
      `País: 1058 - Brasil`
    ].join('\n');
    copiar(texto, 'bloco_cliente');
  };

  const copiarItensNFe = () => {
    const linhas = itensComRateio.map((it, idx) => {
      return `Item ${idx + 1}: ${it.nome} (SKU: ${it.sku || 'FP-DL-R00'}) | Qtd: ${it.quantidade} UN | V.Unit: ${fmtCurrency(it.valor_unitario)} | Subtotal: ${fmtCurrency(it.itemSubtotal)} | Frete Rateado: ${fmtCurrency(it.freteRateado)} | Total Item: ${fmtCurrency(it.totalItem)}`;
    });
    linhas.push(`\n--- TOTAIS ---`);
    linhas.push(`Subtotal Produtos: ${fmtCurrency(subtotalProdutos)}`);
    linhas.push(`Frete Total: ${fmtCurrency(freteTotal)}`);
    linhas.push(`Desconto Total: ${fmtCurrency(descontoTotal)}`);
    linhas.push(`VALOR TOTAL DA NF: ${fmtCurrency(totalNF)}`);
    copiar(linhas.join('\n'), 'bloco_itens');
  };

  const copiarSugestoesFiscais = () => {
    const texto = [
      `SUGESTÕES FISCAIS (Confirmar antes de emitir):`,
      `• Natureza da Operação: ${naturezaOperacaoSugerida}`,
      `• CFOP Sugerido: ${cfopSugerido} (${cfopDescricao})`,
      `• NCM Sugerido: ${ncmSugerido} (Jogos de tabuleiro)`,
      `• Origem: ${origemSugerida}`,
      `• CSOSN: ${csosnSugerido}`,
      `• CST PIS / COFINS: ${cstPisCofins}`,
      `• Indicador IE: ${indicadorIESugerido} (${indicadorIEDescricao})`,
      `• Modalidade Frete: ${modalidadeFreteSugerida}`
    ].join('\n');
    copiar(texto, 'bloco_fiscal');
  };

  const copiarPagamentoTransporte = () => {
    const texto = [
      `DADOS DE PAGAMENTO E TRANSPORTE:`,
      `• Forma de Pagamento SEFAZ: ${pagtoSefaz.label}`,
      `• Valor do Pagamento: ${fmtCurrency(totalNF)}`,
      `• Modalidade de Frete: ${modalidadeFreteSugerida}`,
      `• Transportadora: ${orcamento.transportadora || 'Não informada'}`,
      `• CNPJ da transportadora: não cadastrado`,
      `• Quantidade de Volumes: ${volumesCalculados.volumes} CAIXA`,
      `• Peso Líquido: ${volumesCalculados.pesoLiquido} kg`,
      `• Peso Bruto: ${volumesCalculados.pesoBruto} kg`
    ].join('\n');
    copiar(texto, 'bloco_pagto_transporte');
  };

  const copiarObservacoes = () => {
    copiar(textoInfCplCompleto, 'bloco_obs');
  };

  const copiarResumoCompleto = () => {
    const resumo = [
      `==================================================`,
      `CENTRAL DE PREPARAÇÃO DA NF-e — FORMAPLAY`,
      `Orçamento: ${orcamento.numero || 'S-N'} | Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `==================================================\n`,
      `1. DESTINATÁRIO (DADOS DO CLIENTE):`,
      `Razão Social / Nome: ${razaoOuNome}`,
      `CPF/CNPJ: ${documento}`,
      `Indicador IE (Sugestão): ${indicadorIESugerido}`,
      `IE: ${ie || 'Isento / Não informado'}`,
      `E-mail: ${email}`,
      `Telefone: ${telefone}`,
      `Endereço: ${logradouro}, ${numero || 'S/N'} ${complemento ? '- ' + complemento : ''}`,
      `Bairro: ${bairro} | CEP: ${cep} | Cidade: ${cidade}/${uf}\n`,
      `2. PRODUTOS & VALORES:`,
      ...itensComRateio.map((it, idx) => `• [${idx + 1}] ${it.nome} (${it.sku || 'FP-DL-R00'}) — Qtd: ${it.quantidade} UN x ${fmtCurrency(it.valor_unitario)} = Subtotal: ${fmtCurrency(it.itemSubtotal)} (Frete: ${fmtCurrency(it.freteRateado)})`),
      `Subtotal Produtos: ${fmtCurrency(subtotalProdutos)} | Frete: ${fmtCurrency(freteTotal)} | Desconto: ${fmtCurrency(descontoTotal)}`,
      `TOTAL DA NF-e: ${fmtCurrency(totalNF)}\n`,
      `3. SUGESTÕES FISCAIS (Confirmar antes de emitir):`,
      `CFOP: ${cfopSugerido} | NCM: ${ncmSugerido} | Origem: ${origemSugerida} | CSOSN: ${csosnSugerido}\n`,
      `4. PAGAMENTO & LOGÍSTICA:`,
      `Meio Pagamento: ${pagtoSefaz.label} (Total: ${fmtCurrency(totalNF)})`,
      `Frete: ${modalidadeFreteSugerida} | Transportadora: ${orcamento.transportadora || 'Não informada'}`,
      `Volumes: ${volumesCalculados.volumes} CAIXA | Peso Líq: ${volumesCalculados.pesoLiquido} kg | Peso Bruto: ${volumesCalculados.pesoBruto} kg\n`,
      `5. INFORMAÇÕES ADICIONAIS:`,
      `[Sugestão Fiscal - Confirmar]: ${textoSimplesNacional}`,
      `[Texto Comercial]: ${textoObservacaoPedido}`
    ].join('\n');
    copiar(resumo, 'resumo_completo');
  };

  const FieldCopia = ({ label, value, id, badge }: { label: string; value: any; id: string; badge?: string }) => (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-slate-400">{label}</label>
        {badge && (
          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${
            badge.includes('Confirmar') 
              ? 'text-amber-300 bg-amber-950/70 border-amber-700/50' 
              : 'text-blue-400 bg-blue-950/60 border-blue-800/40'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between p-0 overflow-hidden pr-1 border border-slate-700/60 rounded-xl bg-[#0a1128]/70 focus-within:border-blue-500 transition-colors">
        <span className="px-3.5 py-2 truncate font-semibold text-xs text-slate-200" title={String(value || '-')}>
          {value || '-'}
        </span>
        <button
          type="button"
          onClick={() => copiar(value, id)}
          disabled={!value}
          className="flex-shrink-0 p-1.5 mx-1 rounded-lg text-blue-400 hover:bg-blue-900/40 hover:text-blue-200 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Copiar campo"
        >
          {copiado === id ? <CheckCircle size={15} className="text-emerald-400" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-[#020617]/85 backdrop-blur-md animate-fade-in transition-opacity">
      <div className="bg-[#020617] rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.7)] border border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0f172a] shadow-sm relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40 flex-shrink-0">
              <Receipt size={22} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                  Central de Preparação da NF-e
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/60">
                  Emissor Sebrae
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                Apoio estruturado para preenchimento manual sem erros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex-shrink-0"
            title="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Action Bar Global */}
        <div className="p-3 sm:p-4 bg-slate-900/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-blue-950/70 border border-blue-800/60 rounded-lg text-blue-300 text-xs font-bold uppercase tracking-wider">
              Orçamento: <span className="text-white">{orcamento.numero || 'S-N'}</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-800 border border-slate-700/70 rounded-lg text-slate-400 text-xs font-bold uppercase tracking-wider hidden sm:block">
              Data: <span className="text-slate-200">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={copiarResumoCompleto}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 border border-blue-400/30"
            >
              {copiado === 'resumo_completo' ? (
                <>
                  <CheckCircle size={14} className="text-emerald-300" />
                  <span>Resumo Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar Resumo Completo</span>
                </>
              )}
            </button>

            <a 
              href="https://66710107000131.emissornfe.sebrae.com.br/index-sebrae.html#/home?firstlogin" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 border border-emerald-400/30"
            >
              <ExternalLink size={14} />
              <span>Abrir Emissor Sebrae</span>
            </a>
          </div>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#020617]">

          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 1: DADOS DO DESTINATÁRIO (DADOS OBJETIVOS DO CLIENTE)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500 p-5 sm:p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <User size={16} />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">1. Dados do Destinatário</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Dados objetivos do cliente cadastrados no orçamento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={copiarDadosCliente}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-700/50 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
              >
                {copiado === 'bloco_cliente' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiado === 'bloco_cliente' ? 'Copiado!' : 'Copiar Dados do Cliente'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-2">
                <FieldCopia label="Nome / Razão Social" value={razaoOuNome} id="cli_nome" />
              </div>
              <FieldCopia label="CPF / CNPJ" value={documento} id="cli_doc" />
              <FieldCopia label="Inscrição Estadual (IE)" value={ie || 'Isento / Não informado'} id="cli_ie" />
              <div className="md:col-span-2">
                <FieldCopia label="Indicador da IE (Sugestão)" value={indicadorIESugerido} id="cli_ind_ie" badge={indicadorIEBadge} />
              </div>
              <FieldCopia label="E-mail" value={email} id="cli_email" />
              <FieldCopia label="Telefone" value={telefone} id="cli_tel" />
              <FieldCopia label="CEP" value={cep} id="cli_cep" />
              <div className="md:col-span-2">
                <FieldCopia label="Endereço (Logradouro)" value={logradouro} id="cli_end" />
              </div>
              <FieldCopia label="Número" value={numero} id="cli_num" />
              <FieldCopia label="Complemento" value={complemento} id="cli_comp" />
              <FieldCopia label="Bairro" value={bairro} id="cli_bairro" />
              <FieldCopia label="Cidade" value={cidade} id="cli_cid" />
              <FieldCopia label="UF" value={uf} id="cli_uf" />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 2: PRODUTOS & VALORES (MULTI-ITENS E RATEIO VISUAL)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500 p-5 sm:p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Package size={16} />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">2. Produtos e Valores</h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {itensComRateio.length > 1 ? `Multi-itens (${itensComRateio.length} itens) com rateio proporcional de frete/desconto` : 'Item único do pedido'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={copiarItensNFe}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
              >
                {copiado === 'bloco_itens' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiado === 'bloco_itens' ? 'Copiado!' : 'Copiar Itens da NF-e'}
              </button>
            </div>

            {/* Tabela de Itens */}
            <div className="space-y-3">
              {itensComRateio.map((item, idx) => (
                <div key={idx} className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        SKU: {item.sku || 'FP-DL-R00'}
                      </span>
                      <span className="font-bold text-white text-xs sm:text-sm truncate">
                        {item.nome}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                      <span>Qtd: <strong className="text-slate-200">{item.quantidade} UN</strong></span>
                      <span>Unitário: <strong className="text-slate-200">{fmtCurrency(item.valor_unitario)}</strong></span>
                      <span>Subtotal: <strong className="text-slate-200">{fmtCurrency(item.itemSubtotal)}</strong></span>
                      {freteTotal > 0 && <span>Frete item: <strong className="text-cyan-300">{fmtCurrency(item.freteRateado)}</strong></span>}
                      {descontoTotal > 0 && <span>Desconto item: <strong className="text-amber-300">-{fmtCurrency(item.descontoRateado)}</strong></span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total do Item na NF</span>
                      <span className="font-black text-sm text-emerald-400">{fmtCurrency(item.totalItem)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copiar(`${item.nome} | SKU: ${item.sku || 'FP-DL-R00'} | Qtd: ${item.quantidade} UN | Unit: ${fmtCurrency(item.valor_unitario)} | Subtotal: ${fmtCurrency(item.itemSubtotal)} | Total Item: ${fmtCurrency(item.totalItem)}`, `item_${idx}`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Copiar linha do item"
                    >
                      {copiado === `item_${idx}` ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totais Gerais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <FieldCopia label="Subtotal dos Produtos" value={fmtCurrency(subtotalProdutos)} id="tot_sub" />
              <FieldCopia label="Frete Total" value={fmtCurrency(freteTotal)} id="tot_frete" />
              <FieldCopia label="Desconto Total" value={fmtCurrency(descontoTotal)} id="tot_desc" />
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-emerald-400 mb-1">Valor Total da NF-e</label>
                <div className="flex items-center justify-between p-0 overflow-hidden pr-1 border border-emerald-500/40 rounded-xl bg-emerald-950/20">
                  <span className="px-3.5 py-2 font-black text-sm text-emerald-300">
                    {fmtCurrency(totalNF)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copiar(fmtCurrency(totalNF), 'tot_nfe')}
                    className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-900/40 transition-colors"
                  >
                    {copiado === 'tot_nfe' ? <CheckCircle size={15} className="text-emerald-300" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 3: SUGESTÕES FISCAIS (Claramente identificadas e isoladas)
             ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500 p-5 sm:p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle size={16} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base text-white">3. Sugestões Fiscais</h3>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40">
                      Confirme antes de emitir
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Sugestões operacionais de apoio — não gravadas no banco e não definitivas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={copiarSugestoesFiscais}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 border border-amber-700/50 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
              >
                {copiado === 'bloco_fiscal' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiado === 'bloco_fiscal' ? 'Copiado!' : 'Copiar Sugestões Fiscais'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <div className="md:col-span-2">
                <FieldCopia label="Natureza da Operação" value={naturezaOperacaoSugerida} id="fisc_nat" badge="Sugestão" />
              </div>
              <FieldCopia label="CFOP Sugerido" value={cfopSugerido} id="fisc_cfop" badge={isMesmaUF ? '⚠ Sugestão SP' : '⚠ Sugestão Fora SP'} />
              <FieldCopia label="NCM Sugerido" value={ncmSugerido} id="fisc_ncm" badge="⚠ Sugestão" />
              <FieldCopia label="Origem da Mercadoria" value={origemSugerida} id="fisc_orig" badge="⚠ Sugestão" />
              <FieldCopia label="CSOSN (Simples Nacional)" value={csosnSugerido} id="fisc_csosn" badge="⚠ Sugestão" />
              <FieldCopia label="CST PIS" value={cstPisCofins} id="fisc_pis" badge="⚠ Sugestão" />
              <FieldCopia label="CST COFINS" value={cstPisCofins} id="fisc_cofins" badge="⚠ Sugestão" />
              <FieldCopia label="Modalidade do Frete" value={modalidadeFreteSugerida} id="fisc_frete_mod" badge={freteTotal > 0 ? 'CIF' : 'Sem Frete'} />
            </div>

            <div className="mt-4 p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300/90 flex items-start gap-2.5">
              <Info size={15} className="mt-0.5 shrink-0 text-amber-400" />
              <span>
                <strong>Atenção:</strong> {cfopDescricao} Os códigos fiscais acima são sugestões de preenchimento para apoiar a emissão e devem ser validados com a contabilidade.
              </span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 4: PAGAMENTO & TRANSPORTE
             ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-cyan-500 p-5 sm:p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <CreditCard size={16} />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">4. Pagamento e Transporte</h3>
                  <p className="text-[11px] text-slate-400 font-medium">De-para SEFAZ e estimativa de volumes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={copiarPagamentoTransporte}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
              >
                {copiado === 'bloco_pagto_transporte' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiado === 'bloco_pagto_transporte' ? 'Copiado!' : 'Copiar Pagamento / Transporte'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <FieldCopia label="Forma no App FormaPlay" value={orcamento.pagamento || 'Não informado'} id="pag_app" />
              <div className="md:col-span-2">
                <FieldCopia label="Meio de Pagamento SEFAZ / Sebrae" value={pagtoSefaz.label} id="pag_sefaz" badge="Código SEFAZ" />
              </div>
              <FieldCopia label="Transportadora" value={orcamento.transportadora || 'Não informada'} id="transp_nome" />
              <FieldCopia label="CNPJ Transportadora" value="CNPJ da transportadora: não cadastrado" id="transp_cnpj" />
              <FieldCopia label="Quantidade de Volumes" value={`${volumesCalculados.volumes} volume(s)`} id="transp_vols" badge="Calculado" />
              <FieldCopia label="Espécie dos Volumes" value="CAIXA" id="transp_esp" />
              <FieldCopia label="Peso Líquido Estimado" value={`${volumesCalculados.pesoLiquido} kg`} id="transp_pliq" />
              <FieldCopia label="Peso Bruto Estimado" value={`${volumesCalculados.pesoBruto} kg`} id="transp_pbrt" />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              BLOCO 5: INFORMAÇÕES ADICIONAIS / TEXTOS DA NF
             ══════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0f172a] rounded-2xl shadow-xl border border-slate-800 border-l-4 border-l-violet-500 p-5 sm:p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
                  <FileText size={16} />
                </span>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white">5. Informações Adicionais (InfCpl)</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Textos para o campo de observações da NF-e</p>
                </div>
              </div>
              <button
                type="button"
                onClick={copiarObservacoes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-900/30 hover:bg-violet-900/50 text-violet-300 border border-violet-700/50 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
              >
                {copiado === 'bloco_obs' ? <CheckCircle size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiado === 'bloco_obs' ? 'Copiado!' : 'Copiar Observações'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={12} /> ⚠ Sugestão de informação complementar — confirme antes de emitir
                  </span>
                  <button
                    type="button"
                    onClick={() => copiar(textoSimplesNacional, 'obs_fiscal')}
                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    {copiado === 'obs_fiscal' ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />} Copiar
                  </button>
                </div>
                <div className="form-input p-3 min-h-[75px] border-amber-800/40 bg-amber-950/10 text-xs text-slate-300 leading-relaxed rounded-xl">
                  {textoSimplesNacional}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-300">Texto Comercial do Pedido</span>
                  <button
                    type="button"
                    onClick={() => copiar(textoObservacaoPedido, 'obs_ped')}
                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                  >
                    {copiado === 'obs_ped' ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />} Copiar
                  </button>
                </div>
                <div className="form-input p-3 min-h-[75px] border-slate-700/60 bg-[#0a1128]/70 text-xs text-slate-300 leading-relaxed rounded-xl">
                  {textoObservacaoPedido}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
