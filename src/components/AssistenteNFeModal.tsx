import { useState } from 'react';
import { X, Copy, ExternalLink, CheckCircle, Info, Receipt, User, Package, FileText } from 'lucide-react';
import { Orcamento } from '../types';

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

  const fmtCurrency = (val: number | undefined) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const descSugerida = "Jogo educacional de tabuleiro Desafio Logístico, desenvolvido pela FormaPlay, com foco em aprendizagem prática sobre logística, tomada de decisão, custos, imprevistos e planejamento.";
  const obsSugerida = "Venda de jogo educacional FormaPlay conforme orçamento aprovado.";

  const FieldCopia = ({ label, value, id }: { label: string, value: any, id: string }) => (
    <div className="flex flex-col">
      <label className="form-label">{label}</label>
      <div className="form-input flex items-center justify-between p-0 overflow-hidden pr-1 border-blue-800/50 bg-[#0a1128]/50">
        <span className="px-4 py-2.5 truncate font-semibold text-slate-200">{value || '-'}</span>
        <button
          type="button"
          onClick={() => copiar(value, id)}
          disabled={!value}
          className="flex-shrink-0 p-2 mx-1 rounded-md text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Copiar"
        >
          {copiado === id ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm animate-fade-in transition-opacity">
      <div className="bg-[#020617] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0f172a] shadow-sm relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-md">
              <Receipt size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight leading-none">
                Ficha Auxiliar para Emissão de NF-e
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Apoio para preenchimento manual no Emissor NF-e Sebrae
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#020617]">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div className="flex gap-3">
              <div className="px-3 py-1.5 bg-blue-900/30 border border-blue-800/50 rounded-md text-blue-300 text-xs font-bold uppercase tracking-wider">
                Orçamento: {orcamento.numero || '-'}
              </div>
              <div className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-slate-400 text-xs font-bold uppercase tracking-wider">
                Data: {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <a 
                href="https://emissornfe.sebrae.com.br/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 active:scale-95 transition-all font-bold text-sm shadow-md"
              >
                <ExternalLink size={18} />
                Abrir Emissor Sebrae
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 px-5 py-3.5 bg-blue-950/40 border-2 border-blue-800/50 rounded-xl shadow-sm">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Info size={18} strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-blue-200 text-sm leading-tight mt-1.5">
                Esta ficha é apenas um apoio para preenchimento manual.
              </p>
              <p className="text-xs text-blue-300/80 font-medium mt-0.5">
                A emissão oficial continua sendo feita no Emissor NF-e Sebrae. Utilize os botões para copiar os dados.
              </p>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500 p-6 relative overflow-hidden">
            <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-blue-800 text-white text-xs font-bold flex items-center justify-center">
                <User size={16} />
              </span>
              Dados do Cliente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FieldCopia label="Nome / Razão Social" value={orcamento.cliente_razao_social || orcamento.cliente} id="cli_nome" />
              </div>
              <FieldCopia label="CPF / CNPJ" value={orcamento.cliente_documento} id="cli_doc" />
              <div className="md:col-span-2">
                <FieldCopia label="E-mail" value={orcamento.email} id="cli_email" />
              </div>
              <FieldCopia label="Telefone" value={orcamento.telefone} id="cli_tel" />
              <FieldCopia label="Inscrição Estadual" value={orcamento.cliente_inscricao_estadual} id="cli_ie" />
              <FieldCopia label="CEP" value={orcamento.cliente_cep} id="cli_cep" />
              <div className="md:col-span-2">
                <FieldCopia label="Endereço (Logradouro)" value={orcamento.cliente_logradouro} id="cli_end" />
              </div>
              <FieldCopia label="Número" value={orcamento.cliente_numero} id="cli_num" />
              <FieldCopia label="Complemento" value={orcamento.cliente_complemento} id="cli_comp" />
              <FieldCopia label="Bairro" value={orcamento.cliente_bairro} id="cli_bairro" />
              <FieldCopia label="Cidade" value={orcamento.cliente_cidade} id="cli_cid" />
              <FieldCopia label="UF" value={orcamento.cliente_uf || (orcamento.cidade ? orcamento.cidade.split('/')[1] : '')} id="cli_uf" />
            </div>
          </div>

          {/* Dados do Pedido */}
          <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500 p-6 relative overflow-hidden mt-6">
            <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                <Package size={16} />
              </span>
              Dados do Pedido / Valores
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <FieldCopia label="Produto" value={orcamento.produto} id="ped_prod" />
              </div>
              <FieldCopia label="Quantidade Total" value={orcamento.quantidade} id="ped_qtd" />
              <FieldCopia label="Valor Unitário" value={orcamento.valor_unitario ? fmtCurrency(orcamento.valor_unitario) : ''} id="ped_vun" />
              
              <FieldCopia label="Frete" value={orcamento.frete ? fmtCurrency(orcamento.frete) : 'R$ 0,00'} id="ped_frete" />
              <FieldCopia label="Desconto" value={orcamento.desconto ? fmtCurrency(orcamento.desconto) : 'R$ 0,00'} id="ped_desc" />
              <FieldCopia label="Valor Total da NF" value={orcamento.total ? fmtCurrency(orcamento.total) : ''} id="ped_total" />
              <FieldCopia label="Prazo de Entrega" value={orcamento.prazo_entrega} id="ped_prazo" />
            </div>
          </div>

          {/* Textos Auxiliares */}
          <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500 p-6 relative overflow-hidden mt-6">
            <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 text-white text-xs font-bold flex items-center justify-center">
                <FileText size={16} />
              </span>
              Textos Auxiliares
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Descrição Sugerida</label>
                  <button
                    type="button"
                    onClick={() => copiar(descSugerida, 'txt_desc')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 rounded-md transition-all text-[11px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    {copiado === 'txt_desc' ? <CheckCircle size={14} className="text-white" /> : <Copy size={14} />}
                    Copiar
                  </button>
                </div>
                <div className="form-input p-4 min-h-[100px] border-blue-800/50 bg-[#0a1128]/50 text-slate-300">
                  {descSugerida}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Observação da NF</label>
                  <button
                    type="button"
                    onClick={() => copiar(obsSugerida, 'txt_obs')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-blue-400 hover:text-white hover:bg-blue-600 rounded-md transition-all text-[11px] font-bold uppercase tracking-wider shadow-sm"
                  >
                    {copiado === 'txt_obs' ? <CheckCircle size={14} className="text-white" /> : <Copy size={14} />}
                    Copiar
                  </button>
                </div>
                <div className="form-input p-4 min-h-[100px] border-blue-800/50 bg-[#0a1128]/50 text-slate-300">
                  {obsSugerida}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
