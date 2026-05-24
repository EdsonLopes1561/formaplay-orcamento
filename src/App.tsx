import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Save, Printer, MessageCircle, FolderOpen,
  Trash2, RotateCcw, ChevronDown, CheckCircle, AlertCircle,
  FileText, Users, Tag, Sparkles, Check, Package
} from 'lucide-react';
import { supabase } from './supabase.ts';
import { Orcamento, EMPRESA, PRODUTOS, emptyOrcamento } from './types';
import { PrintView } from './components/PrintView';
import { HistoricoModal } from './components/HistoricoModal';

type Toast = { type: 'success' | 'error'; message: string };

const getProdutoImagem = (nome: string): string | null => {
  const n = (nome || '').toLowerCase();
  if (n.includes('logístico') || n.includes('logistico')) return '/desafio-logistico.png';
  if (n.includes('kids')) return '/desafio-kids.png';
  if (n.includes('professor')) return '/edicao-professor.png';
  return null;
};

type ProdutoInfo = {
  titulo: string;
  descricao: string;
  publico: string;
  categoria: string;
  diferenciais: string[];
  conteudo: string[];
};

const getProdutoInfo = (nome: string): ProdutoInfo | null => {
  const n = (nome || '').toLowerCase();
  if (n.includes('kids')) {
    return {
      titulo: 'Desafio Kids',
      descricao:
        'Jogo educativo voltado ao desenvolvimento lógico, interação infantil e aprendizado divertido.',
      publico: 'Crianças de 6 a 12 anos',
      categoria: 'Educacional Infantil',
      diferenciais: [
        'Aprendizado divertido',
        'Desenvolvimento lógico',
        'Interação infantil',
        'Estímulo criativo',
      ],
      conteudo: [
        'Tabuleiro infantil',
        'Cartas coloridas',
        'Peças educativas',
        'Manual infantil',
        'Dinâmicas lúdicas',
      ],
    };
  }
  if (n.includes('logístico') || n.includes('logistico')) {
    return {
      titulo: 'Desafio Logístico',
      descricao:
        'Simulação prática de operações logísticas, estratégia e tomada de decisão profissional.',
      publico: 'Estudantes, professores e profissionais',
      categoria: 'Educacional',
      diferenciais: [
        'Aprendizado prático',
        'Estratégia e tomada de decisão',
        'Aplicação educacional',
        'Dinâmica em grupo',
      ],
      conteudo: [
        'Tabuleiro premium',
        'Cartas operacionais',
        'Peões personalizados',
        'Dados',
        'Manual do jogo',
        'Dinâmicas educacionais',
      ],
    };
  }
  if (n.includes('professor')) {
    return {
      titulo: 'Edição Professor',
      descricao:
        'Versão voltada para aplicação em sala de aula, treinamentos e atividades educacionais.',
      publico: 'Professores, educadores e facilitadores',
      categoria: 'Ensino e Treinamento',
      diferenciais: [
        'Aplicação em sala de aula',
        'Material de apoio educacional',
        'Dinâmicas pedagógicas',
        'Treinamentos e workshops',
      ],
      conteudo: [
        'Material pedagógico',
        'Cartas avançadas',
        'Guia do educador',
        'Dinâmicas em grupo',
        'Aplicação em sala',
      ],
    };
  }
  return null;
};

function App() {
  const [form, setForm] = useState<Omit<Orcamento, 'id' | 'created_at'>>(emptyOrcamento());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Orcamento[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const calcularNumeroOrcamento = async (): Promise<string> => {
    const { count } = await supabase
      .from('orcamentos')
      .select('*', { count: 'exact', head: true });
    const next = (count ?? 0) + 1;
    return `#${String(next).padStart(4, '0')}`;
  };

  const calcularValores = (f: Omit<Orcamento, 'id' | 'created_at'>) => {
    const subtotal = Number(f.quantidade || 0) * Number(f.valor_unitario || 0);
    const total = subtotal + Number(f.frete || 0) - Number(f.desconto || 0);
    return { ...f, subtotal, total };
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const numeric = ['quantidade', 'valor_unitario', 'frete', 'desconto'];

    let updated = {
      ...form,
      [name]: numeric.includes(name) ? parseFloat(value) || 0 : value,
    };

    if (name === 'produto') {
      const produto = PRODUTOS.find((p) => p.nome === value);
      if (produto) {
        updated.valor_unitario = produto.preco;
      }
    }

    setForm(calcularValores(updated));
  };

  const carregarHistorico = useCallback(async () => {
    setLoadingHistorico(true);
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setHistorico(data as Orcamento[]);
    setLoadingHistorico(false);
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const novoOrcamento = async () => {
    const numero = await calcularNumeroOrcamento();
    setForm({
      ...emptyOrcamento(),
      numero,
      data_orcamento: new Date().toLocaleDateString('pt-BR'),
    });
    setCurrentId(null);
  };

  const salvarOrcamento = async () => {
    if (!form.cliente.trim()) {
      showToast('error', 'Informe o nome do cliente antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (currentId) {
        const { error } = await supabase
          .from('orcamentos')
          .update(payload)
          .eq('id', currentId);
        if (error) throw error;
        showToast('success', 'Orçamento atualizado com sucesso!');
      } else {
        const numero = form.numero || await calcularNumeroOrcamento();
        const { data, error } = await supabase
          .from('orcamentos')
          .insert({ ...payload, numero })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setCurrentId((data as Orcamento).id ?? null);
          setForm((prev) => ({ ...prev, numero: (data as Orcamento).numero }));
        }
        showToast('success', 'Orçamento salvo com sucesso!');
      }
      await carregarHistorico();
    } catch {
      showToast('error', 'Erro ao salvar orçamento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const carregarOrcamento = (orc: Orcamento) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, ...rest } = orc;
    setForm(rest);
    setCurrentId(id ?? null);
  };

  const excluirOrcamento = async (id: string) => {
    const { error } = await supabase.from('orcamentos').delete().eq('id', id);
    if (error) {
      showToast('error', 'Erro ao excluir orçamento.');
      return;
    }
    if (currentId === id) {
      setForm(emptyOrcamento());
      setCurrentId(null);
    }
    showToast('success', 'Orçamento excluído.');
    await carregarHistorico();
  };

  const limparHistorico = async () => {
    if (!window.confirm('Tem certeza que deseja apagar TODOS os orçamentos? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('orcamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      showToast('error', 'Erro ao limpar histórico.');
      return;
    }
    setHistorico([]);
    setForm(emptyOrcamento());
    setCurrentId(null);
    setShowHistorico(false);
    showToast('success', 'Histórico limpo com sucesso!');
  };

  const imprimirOrcamento = () => {
    window.print();
  };

  const enviarWhatsApp = () => {
    const fmtVal = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const lines = [
      `*${EMPRESA.nome}*`,
      `Orçamento ${form.numero} — ${form.data_orcamento}`,
      ``,
      `*Cliente:* ${form.cliente}`,
      `*Produto:* ${form.produto}`,
      `*Qtd:* ${form.quantidade} x ${fmtVal(form.valor_unitario)}`,
      `*Subtotal:* ${fmtVal(form.subtotal)}`,
      form.frete > 0 ? `*Frete:* ${fmtVal(form.frete)}` : '',
      form.desconto > 0 ? `*Desconto:* ${fmtVal(form.desconto)}` : '',
      `*TOTAL: ${fmtVal(form.total)}*`,
      ``,
      `*Prazo:* ${form.prazo_entrega}`,
      `*Validade:* ${form.validade}`,
      `*Pagamento:* ${form.pagamento}`,
      form.observacoes ? `*Obs:* ${form.observacoes}` : '',
    ].filter(Boolean).join('\n');
    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  const fmtCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
      {/* Print-only area */}
      <div className="hidden print:block">
        <PrintView orcamento={{ ...form, id: currentId ?? undefined }} />
      </div>

      {/* Screen UI */}
      <div className="print:hidden min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium transition-all duration-300 ${
              toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
       <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-b-4 border-green-400 shadow-2xl sticky top-0 z-40 backdrop-blur-md">
  <div className="max-w-6xl mx-auto px-4 py-5">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-5">

        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-green-400 shadow-2xl bg-blue-900 flex items-center justify-center">
          <img
            src="/logocircular.png"
            alt="FormaPlay"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="border-l-4 border-green-400 pl-5 py-1">
          <h1 className="font-black text-white leading-tight text-2xl tracking-tight drop-shadow-lg">
            FormaPlay
          </h1>

          <p className="text-sm font-extrabold text-green-300 tracking-wide uppercase">
            Jogos Educacionais
          </p>

          <p className="text-xs text-blue-100 mt-1 font-medium tracking-wide">
            Sistema de Orçamentos Profissionais
          </p>
        </div>

      </div>
              {form.numero && (
                <div className="text-right bg-gradient-to-r from-green-500 to-green-600 px-5 py-3 rounded-xl border-2 border-green-300 shadow-lg transform hover:scale-105 transition-all">
                  <span className="text-xs text-green-900 font-black uppercase tracking-widest block">Orçamento</span>
                  <p className="font-black text-white text-2xl leading-tight mt-1">{form.numero}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={novoOrcamento}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg hover:from-blue-800 hover:to-blue-700 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <Plus size={18} /> Novo Orçamento
            </button>
            <button
              onClick={salvarOrcamento}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 active:scale-95 transition-all font-bold text-sm shadow-md disabled:opacity-60"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Salvar
            </button>
            <button
              onClick={imprimirOrcamento}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-lg hover:from-blue-800 hover:to-blue-900 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <Printer size={18} /> PDF
            </button>
            <button
              onClick={enviarWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe5d] active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <MessageCircle size={18} /> WhatsApp
            </button>
            <button
              onClick={() => { setShowHistorico(true); carregarHistorico(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-blue-900 text-blue-900 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <FolderOpen size={18} />
              Histórico
              {historico.length > 0 && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {historico.length}
                </span>
              )}
            </button>
            {currentId && (
              <button
                onClick={() => excluirOrcamento(currentId)}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all font-bold text-sm shadow-md"
              >
                <Trash2 size={18} /> Excluir
              </button>
            )}
            <button
              onClick={limparHistorico}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <RotateCcw size={18} /> Limpar Histórico
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Client info */}
              <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-900 p-6">
                <h2 className="font-black text-gray-900 mb-5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-blue-800 text-white text-xs font-bold flex items-center justify-center">1</span>
                  Dados do Cliente
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="form-label">Cliente *</label>
                    <input name="cliente" value={form.cliente} onChange={handleChange}
                      className="form-input" placeholder="Nome completo ou razão social" />
                  </div>
                  <div>
                    <label className="form-label">Telefone</label>
                    <input name="telefone" value={form.telefone} onChange={handleChange}
                      className="form-input" placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="form-label">Cidade/UF</label>
                    <input name="cidade" value={form.cidade} onChange={handleChange}
                      className="form-input" placeholder="Ex: São Paulo/SP" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">E-mail</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange}
                      className="form-input" placeholder="cliente@email.com" />
                  </div>
                </div>
              </div>

              {/* Product */}
              <div className="bg-white rounded-xl shadow-md border-l-4 border-green-500 p-6">
                <h2 className="font-black text-gray-900 mb-5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                  Jogo / Produto
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="sm:col-span-3">
                    <label className="form-label">Jogo / Produto</label>
                    <div className="relative">
                      <select name="produto" value={form.produto} onChange={handleChange}
                        className="form-input appearance-none pr-10">
                        <option value="">Selecione um jogo...</option>
                        {PRODUTOS.map((prod) => (
                          <option key={prod.nome} value={prod.nome}>
                            {prod.nome} — R$ {prod.preco.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Quantidade</label>
                    <input name="quantidade" type="number" min="1" value={form.quantidade} onChange={handleChange}
                      className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Valor Unitário (R$)</label>
                    <input name="valor_unitario" type="number" min="0" step="0.01" value={form.valor_unitario} onChange={handleChange}
                      className={form.produto ? "form-input bg-blue-50 text-blue-700 cursor-not-allowed font-semibold" : "form-input"}
                      readOnly={!!form.produto}
                    />
                  </div>
                  <div>
                    <label className="form-label">Subtotal</label>
                    <input value={fmtCurrency(form.subtotal)} readOnly
                      className="form-input bg-blue-50 text-blue-700 cursor-not-allowed font-semibold" />
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-700 p-6">
                <h2 className="font-black text-gray-900 mb-5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 text-white text-xs font-bold flex items-center justify-center">3</span>
                  Condições Comerciais
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Prazo de Entrega</label>
                    <input name="prazo_entrega" value={form.prazo_entrega} onChange={handleChange}
                      className="form-input" placeholder="Ex: 5 dias úteis" />
                  </div>
                  <div>
                    <label className="form-label">Validade do Orçamento</label>
                    <input name="validade" value={form.validade} onChange={handleChange}
                      className="form-input" placeholder="Ex: 15 dias" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Forma de Pagamento</label>
                    <div className="relative">
                      <select name="pagamento" value={form.pagamento} onChange={handleChange}
                        className="form-input appearance-none pr-10">
                        <option value="">Selecione...</option>
                        <option>À vista — PIX</option>
                        <option>À vista — Transferência</option>
                        <option>À vista — Dinheiro</option>
                        <option>Boleto bancário</option>
                        <option>Cartão de crédito — 1x</option>
                        <option>Cartão de crédito — 2x sem juros</option>
                        <option>Cartão de crédito — 3x sem juros</option>
                        <option>50% entrada + 50% na entrega</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Observações</label>
                    <textarea name="observacoes" value={form.observacoes} onChange={handleChange}
                      rows={3} className="form-input resize-none"
                      placeholder="Informações adicionais, condições especiais..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Budget identification */}
              <div className="bg-white rounded-xl shadow-md border-l-4 border-blue-900 p-6">
                <h2 className="font-black text-gray-900 mb-5">Identificação</h2>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Número do Orçamento</label>
                    <input name="numero" value={form.numero} onChange={handleChange}
                      className="form-input font-bold text-green-600 bg-green-50" placeholder="#0001" />
                  </div>
                  <div>
                    <label className="form-label">Data</label>
                    <input name="data_orcamento" value={form.data_orcamento} onChange={handleChange}
                      className="form-input" placeholder="dd/mm/aaaa" />
                  </div>
                </div>
              </div>

              {/* Selected product card */}
              {(() => {
                const imgSrc = getProdutoImagem(form.produto);
                if (!imgSrc) return null;
                return (
                  <div className="bg-white rounded-xl shadow-md border border-blue-200 p-5" translate="no">
                    <h2 className="font-bold text-blue-900 mb-3 text-sm border-l-4 border-blue-700 pl-3" translate="no">
                      Produto Selecionado
                    </h2>
                    <div className="bg-blue-50/60 rounded-lg border border-blue-100 p-3 flex items-center justify-center min-h-[140px]">
                      <img
                        src={imgSrc}
                        alt={form.produto}
                        className="max-h-40 w-auto object-contain"
                      />
                    </div>
                    <div className="mt-3">
                      <p className="font-bold text-sm text-blue-900" translate="no">{form.produto}</p>
                      <p className="text-xs text-blue-600 font-semibold mt-1" translate="no">
                        Valor unitário: {fmtCurrency(form.valor_unitario)}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Product description card */}
              {(() => {
                const info = getProdutoInfo(form.produto);
                if (!info) return null;
                return (
                  <div className="bg-white rounded-xl shadow-md border border-blue-200 p-5" translate="no">
                    <div className="flex items-center gap-2 mb-3 border-l-4 border-blue-700 pl-3">
                      <FileText className="w-4 h-4 text-blue-700" />
                      <h2 className="font-bold text-blue-900 text-sm" translate="no">
                        Descrição do Produto
                      </h2>
                    </div>
                    <h3 className="font-black text-blue-900 text-base mb-2" translate="no">
                      {info.titulo}
                    </h3>
                    <p className="text-sm text-gray-700 leading-relaxed mb-3" translate="no">
                      {info.descricao}
                    </p>
                    <div className="grid grid-cols-1 gap-2 pt-3 border-t border-blue-100">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700 block">
                            Público-alvo
                          </span>
                          <span className="text-xs text-gray-700 font-medium" translate="no">
                            {info.publico}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-700 block">
                            Categoria
                          </span>
                          <span className="text-xs text-gray-700 font-medium" translate="no">
                            {info.categoria}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Product differentials card */}
              {(() => {
                const info = getProdutoInfo(form.produto);
                if (!info) return null;
                return (
                  <div className="bg-white rounded-xl shadow-md border border-blue-200 p-5" translate="no">
                    <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-700 pl-3">
                      <Sparkles className="w-4 h-4 text-blue-700" />
                      <h2 className="font-bold text-blue-900 text-sm" translate="no">
                        Diferenciais do Produto
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {info.diferenciais.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 bg-blue-50/60 rounded-lg px-3 py-2 border border-blue-100"
                          translate="no"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </span>
                          <span className="text-sm text-gray-800 font-medium leading-snug">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Box contents card */}
              {(() => {
                const info = getProdutoInfo(form.produto);
                if (!info) return null;
                return (
                  <div className="bg-white rounded-xl shadow-md border border-blue-200 p-5" translate="no">
                    <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-700 pl-3">
                      <Package className="w-4 h-4 text-blue-700" />
                      <h2 className="font-bold text-blue-900 text-sm" translate="no">
                        Conteúdo da Caixa
                      </h2>
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                      {info.conteudo.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 bg-blue-50/60 rounded-lg px-3 py-2 border border-blue-100"
                          translate="no"
                        >
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-blue-600 to-blue-800" />
                          <span className="text-sm text-gray-800 font-medium leading-snug">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              {/* Financial summary */}
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg border-l-4 border-green-400 p-6 text-white">
                <h2 className="font-black text-green-300 mb-5 text-lg">Resumo Financeiro</h2>
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Frete (R$)</label>
                    <input name="frete" type="number" min="0" step="0.01" value={form.frete} onChange={handleChange}
                      className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Desconto (R$)</label>
                    <input name="desconto" type="number" min="0" step="0.01" value={form.desconto} onChange={handleChange}
                      className="form-input" />
                  </div>

                  <div className="pt-5 border-t-2 border-green-400/30 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-50 font-semibold">Subtotal</span>
                      <span className="text-green-100 font-bold">{fmtCurrency(form.subtotal)}</span>
                    </div>
                    {form.frete > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-50 font-semibold">Frete</span>
                        <span className="text-green-100 font-bold">+ {fmtCurrency(form.frete)}</span>
                      </div>
                    )}
                    {form.desconto > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-50 font-semibold">Desconto</span>
                        <span className="text-red-200 font-bold">- {fmtCurrency(form.desconto)}</span>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t-2 border-green-400/40" />
                    <div className="flex justify-between items-center bg-gradient-to-r from-green-600 to-green-500 rounded-xl px-5 py-4 shadow-lg transform">
                      <span className="font-black text-white text-lg uppercase tracking-wide">Total Final</span>
                      <span className="text-3xl font-black text-white drop-shadow-lg">{fmtCurrency(form.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company card */}
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 text-white shadow-sm">
                <img src="/logocircular.png" alt="FormaPlay" className="h-12 object-contain mb-3" />
                <p className="font-bold text-sm">{EMPRESA.nome}</p>
                <div className="mt-2 space-y-1 text-blue-100 text-xs">
                  <p>CNPJ: {EMPRESA.cnpj}</p>
                  <p>WhatsApp: {EMPRESA.whatsapp}</p>
                  <p>{EMPRESA.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historico Modal */}
      {showHistorico && (
        <HistoricoModal
          orcamentos={historico}
          onClose={() => setShowHistorico(false)}
          onCarregar={carregarOrcamento}
          onExcluir={excluirOrcamento}
          onLimpar={limparHistorico}
          loading={loadingHistorico}
        />
      )}
    </>
  );
}

export default App;
