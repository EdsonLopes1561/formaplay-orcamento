import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Save, Printer, MessageCircle, FolderOpen, Copy, CopyPlus,
  Trash2, RotateCcw, ChevronDown, CheckCircle, AlertCircle,
  FileText, Users, Tag, Sparkles, Check, Package, LogOut, User, BarChart2, Mailbox, Download, Activity
} from 'lucide-react';
import { supabase } from './supabase.ts';
import { Orcamento, Cliente, EMPRESA, PRODUTOS, emptyOrcamento, SolicitacaoOrcamento } from './types';
import { PrintView } from './components/PrintView';
import { HistoricoModal } from './components/HistoricoModal';
import { ClientesModal } from './components/ClientesModal';
import { DashboardModal } from './components/DashboardModal';
import { FormaPlayBrand } from './components/FormaPlayBrand';
import { SolicitacoesModal } from './components/SolicitacoesModal';
import { ExportModal } from './components/ExportModal';
import { TorreControleModal } from './components/TorreControleModal';

type Toast = { type: 'success' | 'error'; message: string };

const getProdutoImagem = (nome: string): string | null => {
  const n = (nome || '').toLowerCase();
  if (n.includes('premium')) return '/desafio-logistico-premium.png';
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
  if (n.includes('premium')) {
    return {
      titulo: 'Desafio Logístico Premium',
      descricao: 'Versão especial do Desafio Logístico com apresentação premium, ideal para instituições, eventos, premiações e experiências educacionais diferenciadas.',
      publico: 'Instituições de ensino, empresas, eventos, professores e profissionais que desejam uma experiência educacional com acabamento superior.',
      categoria: 'Educacional Premium',
      diferenciais: [
        'Apresentação diferenciada',
        'Ideal para eventos e premiações',
        'Experiência educacional com acabamento superior',
        'Mesma base pedagógica do Desafio Logístico',
      ],
      conteudo: [
        'Tabuleiro premium',
        'Cartas operacionais premium',
        'Peões personalizados',
        'Dados',
        'Manual especial do jogo',
        'Caixa rígida premium',
      ],
    };
  }
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
  const [showClientes, setShowClientes] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTorreControle, setShowTorreControle] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoOrcamento[]>([]);
  const [showSolicitacoes, setShowSolicitacoes] = useState(false);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  const [solicitacaoOrigemId, setSolicitacaoOrigemId] = useState<string | null>(null);
  const [clienteData, setClienteData] = useState<Cliente | null>(null);

  const converterSolicitacao = async (s: SolicitacaoOrcamento) => {
    const unitPrice = PRODUTOS.find((p) => p.nome === s.jogo_escolhido)?.preco || 0;
    const numeroAtual = form.numero || await calcularNumeroOrcamento();
    
    let infoComple = `Origem: Solicitação pública ${s.codigo}`;
    if (s.embrulho_presente) {
      infoComple += `\nEmbrulho para presente: SIM`;
    }

    const enderecoCompleto = s.endereco 
      ? `${s.endereco}, ${s.numero || 'S/N'}${s.complemento ? `, ${s.complemento}` : ''}, ${s.bairro || ''}, ${s.cidade || ''}/${s.estado || ''} - CEP ${s.cep || ''}`
      : '';

    const novo = {
      ...emptyOrcamento(),
      numero: numeroAtual,
      data_orcamento: form.data_orcamento || new Date().toLocaleDateString('pt-BR'),
      cliente: s.nome_razao,
      telefone: s.telefone,
      email: s.email || '',
      cidade: `${s.cidade || ''}/${s.estado || ''}`,
      produto: s.jogo_escolhido,
      quantidade: s.quantidade,
      valor_unitario: unitPrice,
      frete: s.frete_estimado,
      pagamento: s.forma_pagamento,
      observacoes: s.observacoes_cliente && s.observacoes_cliente !== 'Nenhuma' ? s.observacoes_cliente : '',
      informacoes_complementares: infoComple,
      cliente_logradouro: s.endereco || '',
      cliente_numero: s.numero || '',
      cliente_complemento: s.complemento || '',
      cliente_bairro: s.bairro || '',
      cliente_cidade: s.cidade || '',
      cliente_uf: s.estado || '',
      cliente_cep: s.cep || '',
      cliente_endereco_completo: enderecoCompleto,
    };
    
    if (s.forma_pagamento === 'Pix com desconto') {
      novo.desconto = s.desconto_pix;
    }

    setForm(calcularValores(novo));
    setCurrentId(null);
    setSolicitacaoOrigemId(s.id);
    setShowSolicitacoes(false);
    showToast('success', 'Dados preenchidos. Revise e clique em Salvar Orçamento.');
  };

  const carregarSolicitacoes = async () => {
    setLoadingSolicitacoes(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_orcamento')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSolicitacoes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  useEffect(() => {
    carregarSolicitacoes();
  }, []);

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
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const finalValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    const numeric = ['quantidade', 'valor_unitario', 'frete', 'desconto'];

    let updated = {
      ...form,
      [name]: numeric.includes(name) ? parseFloat(value) || 0 : finalValue,
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
    const init = async () => {
      await carregarHistorico();
      // Busca o próximo número correto ao iniciar o app
      const numero = await calcularNumeroOrcamento();
      setForm((prev) => ({ ...prev, numero }));
    };
    init();
  }, [carregarHistorico]);

  const novoOrcamento = async () => {
    if (currentId) {
      const confirmar = window.confirm(
        'Você está editando um orçamento. Deseja descartar as alterações e criar um novo orçamento?'
      );
      if (!confirmar) return;
    }
    const numero = await calcularNumeroOrcamento();
    setForm({
      ...emptyOrcamento(),
      numero,
      data_orcamento: new Date().toLocaleDateString('pt-BR'),
    });
    setCurrentId(null);
    setClienteData(null);
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
        const { data: updatedData, error: updateError } = await supabase
          .from('orcamentos')
          .update(payload)
          .eq('id', currentId)
          .select();
        if (updateError) throw updateError;
        if (!updatedData || updatedData.length === 0) {
          throw new Error(
            'Nenhum orçamento foi atualizado. Verifique permissões RLS no Supabase ou se o ID do orçamento é válido.'
          );
        }
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

      if (solicitacaoOrigemId && !currentId) {
        await supabase
          .from('solicitacoes_orcamento')
          .update({ status: 'Convertida' })
          .eq('id', solicitacaoOrigemId);
        setSolicitacaoOrigemId(null);
        await carregarSolicitacoes();
      }

      await carregarHistorico();
    } catch (err: any) {
      console.error('[salvar] Erro completo:', err);
      const msg = err?.message || 'Erro ao salvar orçamento. Tente novamente.';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const carregarOrcamento = (orc: Orcamento) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, ...rest } = orc;
    // Coerce numeric fields (Supabase may return them as strings)
    const normalized = {
      ...rest,
      quantidade: Number(rest.quantidade) || 0,
      valor_unitario: Number(rest.valor_unitario) || 0,
      frete: Number(rest.frete) || 0,
      desconto: Number(rest.desconto) || 0,
      subtotal: Number(rest.subtotal) || 0,
      total: Number(rest.total) || 0,
      cliente_id: rest.cliente_id,
    };
    setForm(calcularValores(normalized));
    setCurrentId(id ?? null);
    
    if (rest.cliente_id) {
      supabase.from('clientes').select('*').eq('id', rest.cliente_id).maybeSingle()
        .then(({ data }) => {
          if (data) setClienteData(data as Cliente);
        });
    } else {
      setClienteData(null);
    }
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
    const originalTitle = document.title;
    
    const sanitize = (str: string) => {
      if (!str) return '';
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-zA-Z0-9]/g, "_")  // substitui caracteres especiais por underline
        .replace(/_+/g, "_")            // remove underlines duplicados
        .replace(/^_|_$/g, "");         // remove underline das pontas
    };

    const produtoBase = (form.produto || '').split(' - ')[0];
    const numLimpo = (form.numero || 'S-N').replace(/#/g, '');
    
    let fileName = `Orcamento_${numLimpo}`;
    const prodSanitizado = sanitize(produtoBase);
    if (prodSanitizado) {
      fileName += `_${prodSanitizado}`;
    }
    fileName += `_FormaPlay`;
    
    if (fileName.length > 120) fileName = fileName.substring(0, 120);
    
    document.title = fileName;
    
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }, 100);
  };

  const enviarWhatsApp = () => {
    const mensagem = `Olá, segue o orçamento referente ao jogo Desafio Logístico.\nA FormaPlay fica à disposição para qualquer dúvida.`;
    let url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    
    if (form.telefone) {
      let numero = form.telefone.replace(/\D/g, '');
      if (numero.length >= 10 && numero.length <= 11) {
        numero = `55${numero}`;
      }
      if (numero) {
        url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
      }
    }
    
    window.open(url, '_blank');
  };

  const copiarMensagem = async () => {
    const mensagem = `Olá, segue o orçamento referente ao jogo Desafio Logístico.\nA FormaPlay fica à disposição para qualquer dúvida.`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(mensagem);
        showToast('success', 'Mensagem copiada com sucesso.');
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error) {
      showToast('error', 'Não foi possível copiar a mensagem. Copie manualmente.');
    }
  };

  const duplicarOrcamento = async () => {
    if (!currentId) return; // Only makes sense to duplicate an existing saved one (or we can duplicate unsaved, doesn't matter, but user says "duplicar um orcamento existente")
    
    try {
      const numero = await calcularNumeroOrcamento();
      setForm((prev) => ({
        ...prev,
        numero,
        data_orcamento: new Date().toLocaleDateString('pt-BR'),
        status: 'Aberto',
        prioridade: 'Baixa',
        data_retorno: '',
        proxima_acao: '',
        observacao_interna: ''
      }));
      setCurrentId(null);
      showToast('success', 'Orçamento duplicado com sucesso.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Não foi possível duplicar o orçamento.');
    }
  };

  const fmtCurrency = (v: number | string | null | undefined) => {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      {/* Print-only area */}
      <div className="hidden print:block">
        <PrintView orcamento={{ ...form, id: currentId ?? undefined }} clienteData={clienteData} />
      </div>

      {/* Screen UI */}
      <div className="print:hidden min-h-screen bg-[#0a0f1d] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.2),rgba(255,255,255,0))] text-slate-200">
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
        <header className="bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 border-b-4 border-green-400 shadow-2xl sticky top-0 z-40 backdrop-blur-md w-full overflow-hidden">
          <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-5 w-full">
            <div className="flex flex-row items-center justify-between gap-2">
              
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 sm:h-16 sm:w-16 flex-shrink-0 rounded-full border-2 border-green-400 shadow-2xl flex items-center justify-center bg-white">
                  <img
                    src="/logocircular.png"
                    alt="FormaPlay"
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="border-l-4 border-green-400 pl-2 sm:pl-5 py-0.5 sm:py-1 min-w-0">
                  <h1 className="font-black text-white leading-tight text-base sm:text-2xl tracking-tight drop-shadow-lg truncate">
                    <FormaPlayBrand />
                  </h1>
                  <p className="text-[9px] sm:text-sm font-extrabold text-green-300 tracking-wide uppercase truncate">
                    Jogos Educacionais
                  </p>
                  <p className="hidden sm:block text-[9px] sm:text-xs text-blue-100 mt-0.5 sm:mt-1 font-medium tracking-wide truncate">
                    Sistema de Orçamentos Profissionais
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                {form.numero && (
                  <div className="text-right bg-gradient-to-r from-green-500 to-green-600 px-2.5 py-1.5 sm:px-5 sm:py-3 rounded-lg sm:rounded-xl border border-green-300 shadow-lg transform hover:scale-105 transition-all">
                    <span className="text-[8px] sm:text-xs text-green-900 font-black uppercase tracking-widest block">Orç.</span>
                    <p className="font-black text-white text-sm sm:text-2xl leading-tight">{form.numero}</p>
                  </div>
                )}
                <button
                  onClick={async () => {
                    try {
                      Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('sb-')) localStorage.removeItem(key);
                      });
                      await supabase.auth.signOut();
                    } finally {
                      window.location.reload();
                    }
                  }}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-xs sm:text-sm"
                  title="Sair"
                >
                  <LogOut size={16} className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px]" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>

            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Edit mode banner */}
          {currentId && (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-950/40 border-2 border-amber-500/50 rounded-xl shadow-sm">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-black text-base">✏</span>
              <div className="min-w-0">
                <p className="font-black text-amber-300 text-sm leading-tight">
                  Editando orçamento {form.numero}
                  {form.cliente ? ` · ${form.cliente}` : ''}
                </p>
                <p className="text-xs text-amber-200 font-medium mt-0.5">
                  As alterações substituirão o orçamento salvo ao clicar em &ldquo;Atualizar Orçamento&rdquo;.
                </p>
              </div>
            </div>
          )}
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
              className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-lg active:scale-95 transition-all font-bold text-sm shadow-md disabled:opacity-60 ${
                currentId
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              }`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {currentId ? 'Atualizar Orçamento' : 'Salvar'}
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
              <MessageCircle size={18} /> Enviar WhatsApp
            </button>
            <button
              onClick={copiarMensagem}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg hover:bg-slate-200 active:scale-95 transition-all font-bold text-sm shadow-sm"
            >
              <Copy size={18} /> Copiar mensagem
            </button>
            <button
              onClick={duplicarOrcamento}
              disabled={!currentId}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-sm border ${!currentId ? 'bg-slate-800 text-gray-400 border-slate-700 cursor-not-allowed' : 'bg-purple-900/30 text-purple-300 border-purple-500/50 hover:bg-purple-900/50'}`}
              title="Duplicar este orçamento"
            >
              <CopyPlus size={18} /> Duplicar orçamento
            </button>
            <button
              onClick={() => { setShowHistorico(true); carregarHistorico(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <FolderOpen size={18} />
              Histórico
              {historico.length > 0 && (
                <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                  {historico.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setShowDashboard(true); carregarHistorico(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <BarChart2 size={18} />
              Painel Comercial
            </button>
            <button
              onClick={() => setShowTorreControle(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-800 text-white rounded-lg hover:bg-slate-700 hover:border-slate-700 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <Activity size={18} className="text-orange-400" />
              Torre de Controle
            </button>
            <button
              onClick={() => setShowClientes(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <User size={18} />
              Clientes
            </button>
            <button
              onClick={() => { setShowSolicitacoes(true); carregarSolicitacoes(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 rounded-lg hover:bg-indigo-50 active:scale-95 transition-all font-bold text-sm shadow-md"
            >
              <Mailbox size={18} />
              Solicitações
              {solicitacoes.filter(s => s.status === 'Pendente').length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">
                  {solicitacoes.filter(s => s.status === 'Pendente').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#217346] border-2 border-[#217346] text-white rounded-lg hover:bg-[#1e6b41] hover:border-[#1e6b41] active:scale-95 transition-all font-bold text-sm shadow-md whitespace-nowrap"
            >
              <Download size={18} />
              Exportar Dados
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
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-900 to-blue-800 text-white text-xs font-bold flex items-center justify-center">1</span>
                  Dados do Cliente
                </h2>

                {form.cliente_nome && (
                  <div className="mb-6 p-4 bg-blue-50 border border-slate-700 rounded-lg text-sm text-slate-200 shadow-inner">
                    <p className="font-bold text-blue-400 mb-2 border-b border-blue-800/50 pb-1">Resumo do Cliente Vinculado (Snapshot)</p>
                    <p><strong>Razão Social/Nome:</strong> {form.cliente_razao_social || form.cliente_nome}</p>
                    {form.cliente_nome_fantasia && <p><strong>Fantasia:</strong> {form.cliente_nome_fantasia}</p>}
                    {form.cliente_documento && <p><strong>Documento:</strong> {form.cliente_documento}</p>}
                    {form.cliente_contato_responsavel && <p><strong>Contato:</strong> {form.cliente_contato_responsavel}</p>}
                    {form.cliente_endereco_completo && <p className="mt-1"><strong>Endereço:</strong> {form.cliente_endereco_completo}</p>}
                  </div>
                )}

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
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-green-500 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
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
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                      className={form.produto ? "form-input bg-blue-950/60 border-blue-800 text-blue-300 cursor-not-allowed font-semibold" : "form-input"}
                      readOnly={!!form.produto}
                    />
                  </div>
                  <div>
                    <label className="form-label">Subtotal</label>
                    <input value={fmtCurrency(form.subtotal)} readOnly
                      className="form-input bg-blue-950/60 border-blue-800 text-blue-300 cursor-not-allowed font-semibold" />
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-blue-400 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
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
                    <label className="form-label">Tipo de Frete</label>
                    <div className="relative">
                      <select name="tipo_frete" value={form.tipo_frete || 'A combinar'} onChange={handleChange}
                        className="form-input appearance-none pr-10">
                        <option value="A combinar">A combinar</option>
                        <option value="CIF">CIF (Por conta do Remetente)</option>
                        <option value="FOB">FOB (Por conta do Destinatário)</option>
                        <option value="Retirada">Retirada</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      name="frete_incluso" 
                      id="frete_incluso"
                      checked={form.frete_incluso || false} 
                      onChange={handleChange}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="frete_incluso" className="text-sm font-bold text-slate-300">Frete contemplado no valor total (sem cobrança separada)</label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">Observação sobre Frete</label>
                    <input name="observacao_frete" value={form.observacao_frete || ''} onChange={handleChange}
                      className="form-input" placeholder="Ex: Entrega via transportadora XYZ" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">Forma de Pagamento Base</label>
                    <div className="relative">
                      <select name="pagamento" value={form.pagamento} onChange={handleChange}
                        className="form-input appearance-none pr-10">
                        <option value="">Selecione...</option>
                        <option>À vista — PIX</option>
                        <option>À vista — Transferência</option>
                        <option>À vista — Dinheiro</option>
                        <option>Boleto bancário</option>
                        <option>Boleto bancário — 20/30 dias</option>
                        <option>Depósito bancário — 20/30 dias</option>
                        <option>Cartão de crédito — 1x</option>
                        <option>Cartão de crédito — 2x sem juros</option>
                        <option>Cartão de crédito — 3x sem juros</option>
                        <option>50% entrada + 50% na entrega</option>
                        <option>Conforme processo de pagamento da instituição</option>
                        <option>A combinar</option>
                        <option>Personalizado</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {form.pagamento === 'Personalizado' && (
                    <div className="sm:col-span-2">
                      <label className="form-label">Forma de Pagamento (Personalizada)</label>
                      <textarea name="forma_pagamento_personalizada" value={form.forma_pagamento_personalizada || ''} onChange={handleChange}
                        rows={2} className="form-input resize-none"
                        placeholder="Digite exatamente a forma de pagamento que deverá aparecer no PDF..." />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="form-label">Condições de Pagamento (Detalhes)</label>
                    <textarea name="condicoes_pagamento" value={form.condicoes_pagamento || ''} onChange={handleChange}
                      rows={3} className="form-input resize-none"
                      placeholder="Ex: pagamento contra entrega, via depósito bancário..." />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">Informações Complementares</label>
                    <textarea name="informacoes_complementares" value={form.informacoes_complementares || ''} onChange={handleChange}
                      rows={3} className="form-input resize-none"
                      placeholder="Outras informações pertinentes à proposta..." />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">Observações Internas (Não sai no PDF)</label>
                    <textarea name="observacoes" value={form.observacoes} onChange={handleChange}
                      rows={3} className="form-input resize-none"
                      placeholder="Informações adicionais..." />
                  </div>
                </div>
              </div>

              {/* Follow-up / CRM Interno */}
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-white text-xs font-bold flex items-center justify-center">4</span>
                  Controle Comercial Interno
                </h2>
                <p className="text-xs text-amber-400 font-semibold mb-5 bg-amber-950/30 p-2 rounded border border-amber-900/50 text-amber-400">
                  ⚠️ Não aparece no PDF do cliente
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label">Prioridade</label>
                    <div className="relative">
                      <select name="prioridade" value={form.prioridade || 'Baixa'} onChange={handleChange}
                        className="form-input appearance-none pr-10 font-bold text-slate-300">
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Data de Retorno</label>
                    <input name="data_retorno" type="date" value={form.data_retorno || ''} onChange={handleChange}
                      className="form-input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Próxima Ação</label>
                    <input name="proxima_acao" value={form.proxima_acao || ''} onChange={handleChange}
                      className="form-input" placeholder="Ex: Ligar para confirmar recebimento" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Observação Interna</label>
                    <textarea name="observacao_interna" value={form.observacao_interna || ''} onChange={handleChange}
                      rows={2} className="form-input resize-none"
                      placeholder="Informações confidenciais, detalhes de negociação..." />
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Budget identification */}
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-blue-500 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-5">Identificação</h2>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Número do Orçamento</label>
                    <input
                      name="numero"
                      value={form.numero}
                      onChange={handleChange}
                      readOnly={!!currentId}
                      className={`form-input font-bold ${
                        currentId
                          ? 'text-amber-400 bg-amber-950/50 border border-amber-900 cursor-not-allowed opacity-80'
                          : 'text-green-400 bg-green-950/50 border border-green-900'
                      }`}
                      placeholder="#0001"
                      title={currentId ? 'O número não pode ser alterado durante a edição' : ''}
                    />
                  </div>
                  <div>
                    <label className="form-label">Data</label>
                    <input name="data_orcamento" value={form.data_orcamento} onChange={handleChange}
                      className="form-input" placeholder="dd/mm/aaaa" />
                  </div>
                  <div>
                    <label className="form-label">Status do Orçamento</label>
                    <div className="relative">
                      <select name="status" value={form.status || 'Aberto'} onChange={handleChange}
                        className="form-input appearance-none pr-10 font-bold text-slate-300">
                        <option value="Aberto">Aberto</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Recusado">Recusado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected product card */}
              {(() => {
                const imgSrc = getProdutoImagem(form.produto);
                if (!imgSrc) return null;
                return (
                  <div className="bg-slate-900/80 rounded-xl shadow-md border border-slate-700 p-5" translate="no">
                    <h2 className="font-bold text-blue-400 mb-3 text-sm border-l-4 border-blue-500 pl-3" translate="no">
                      Produto Selecionado
                    </h2>
                    <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-3 px-3 py-2 flex items-center justify-center min-h-[140px]">
                      <img
                        src={imgSrc}
                        alt={form.produto}
                        className="max-h-40 w-auto object-contain"
                      />
                    </div>
                    <div className="mt-3">
                      <p className="font-bold text-sm text-blue-400" translate="no">{form.produto}</p>
                      <p className="text-xs text-blue-300 font-semibold mt-1" translate="no">
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
                  <div className="bg-slate-900/80 rounded-xl shadow-md border border-slate-700 p-5" translate="no">
                    <div className="flex items-center gap-2 mb-3 border-l-4 border-blue-500 pl-3">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <h2 className="font-bold text-blue-400 text-sm" translate="no">
                        Descrição do Produto
                      </h2>
                    </div>
                    <h3 className="font-black text-blue-400 text-base mb-2" translate="no">
                      {info.titulo}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3" translate="no">
                      {info.descricao}
                    </p>
                    <div className="grid grid-cols-1 gap-2 pt-3 border-t border-slate-700">
                      <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-400 block">
                            Público-alvo
                          </span>
                          <span className="text-xs text-slate-300 font-medium" translate="no">
                            {info.publico}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Tag className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-blue-400 block">
                            Categoria
                          </span>
                          <span className="text-xs text-slate-300 font-medium" translate="no">
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
                  <div className="bg-slate-900/80 rounded-xl shadow-md border border-slate-700 p-5" translate="no">
                    <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-500 pl-3">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <h2 className="font-bold text-blue-400 text-sm" translate="no">
                        Diferenciais do Produto
                      </h2>
                    </div>
                    <ul className="space-y-2">
                      {info.diferenciais.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700"
                          translate="no"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </span>
                          <span className="text-sm text-slate-200 font-medium leading-snug">
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
                  <div className="bg-slate-900/80 rounded-xl shadow-md border border-slate-700 p-5" translate="no">
                    <div className="flex items-center gap-2 mb-4 border-l-4 border-blue-500 pl-3">
                      <Package className="w-4 h-4 text-blue-400" />
                      <h2 className="font-bold text-blue-400 text-sm" translate="no">
                        Conteúdo da Caixa
                      </h2>
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                      {info.conteudo.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2.5 bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700"
                          translate="no"
                        >
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-br from-blue-600 to-blue-800" />
                          <span className="text-sm text-slate-200 font-medium leading-snug">
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
                    <label className="form-label !text-blue-100/90">Frete (R$)</label>
                    <input name="frete" type="number" min="0" step="0.01" value={form.frete} onChange={handleChange}
                      className="form-input" />
                  </div>
                  <div>
                    <label className="form-label !text-blue-100/90">Desconto (R$)</label>
                    <input name="desconto" type="number" min="0" step="0.01" value={form.desconto} onChange={handleChange}
                      className="form-input" />
                  </div>

                  <div className="pt-5 border-t-2 border-blue-300/30 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-100 font-semibold">Subtotal</span>
                      <span className="text-white font-bold">{fmtCurrency(form.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-100 font-semibold">Frete</span>
                      <span className="text-white font-bold">+ {fmtCurrency(form.frete)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-100 font-semibold">Desconto</span>
                      <span className="text-red-200 font-bold">- {fmtCurrency(form.desconto)}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-blue-300/40" />
                    <div className="flex justify-between items-center bg-gradient-to-r from-green-600 to-green-500 rounded-xl px-5 py-4 shadow-lg transform">
                      <span className="font-black text-white text-lg uppercase tracking-wide">Total Final</span>
                      <span className="text-3xl font-black text-white drop-shadow-lg">{fmtCurrency(form.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company card */}
              <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-5 text-white shadow-sm">
                <img src="/logocircular.png" alt="FormaPlay" className="h-12 w-12 object-contain mb-3 rounded-full border-2 border-green-400 bg-white" />
                <p className="font-black text-base leading-tight tracking-tight">
                  <FormaPlayBrand />
                  <span className="block text-xs font-bold text-blue-100 tracking-wide uppercase mt-0.5">Jogos Educacionais</span>
                </p>
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

      {/* Clientes Modal */}
      {showClientes && (
        <ClientesModal
          isOpen={showClientes}
          onClose={() => setShowClientes(false)}
          onSelectCliente={(cliente) => {
            const enderecoCompleto = cliente.endereco ? `${cliente.endereco}, ${cliente.numero || 'S/N'}${cliente.complemento ? `, ${cliente.complemento}` : ''}, ${cliente.bairro || ''}, ${cliente.cidade || ''}/${cliente.estado || ''}, CEP: ${cliente.cep || ''}` : '';
            setForm({
              ...form,
              cliente: cliente.nome,
              telefone: cliente.telefone,
              cidade: `${cliente.cidade || ''}/${cliente.estado || ''}`,
              email: cliente.email,
              cliente_id: cliente.id,
              cliente_nome: cliente.nome,
              cliente_razao_social: cliente.razao_social || '',
              cliente_nome_fantasia: cliente.nome_fantasia || '',
              cliente_documento: cliente.documento || '',
              cliente_inscricao_estadual: cliente.inscricao_estadual || '',
              cliente_contato_responsavel: cliente.contato_responsavel || '',
              cliente_telefone: cliente.telefone || '',
              cliente_email: cliente.email || '',
              cliente_cep: cliente.cep || '',
              cliente_logradouro: cliente.endereco || '',
              cliente_numero: cliente.numero || '',
              cliente_complemento: cliente.complemento || '',
              cliente_bairro: cliente.bairro || '',
              cliente_cidade: cliente.cidade || '',
              cliente_uf: cliente.estado || '',
              cliente_endereco_completo: enderecoCompleto,
            });
            setClienteData(cliente);
            setShowClientes(false);
            showToast('success', 'Cliente selecionado com sucesso!');
          }}
        />
      )}

      {/* Dashboard Modal */}
      {showDashboard && (
        <DashboardModal
          orcamentos={historico}
          onClose={() => setShowDashboard(false)}
          onOpenExport={() => setShowExportModal(true)}
        />
      )}

      {/* Torre de Controle Modal */}
      {showTorreControle && (
        <TorreControleModal onClose={() => setShowTorreControle(false)} />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* Solicitacoes Modal */}
      {showSolicitacoes && (
        <SolicitacoesModal
          solicitacoes={solicitacoes}
          onClose={() => setShowSolicitacoes(false)}
          onRefresh={carregarSolicitacoes}
          onConverter={converterSolicitacao}
          loading={loadingSolicitacoes}
        />
      )}
    </>
  );
}

export default App;
