import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Save, Printer, MessageCircle, FolderOpen, Copy, CopyPlus,
  RotateCcw, ChevronDown, CheckCircle, AlertCircle,
  FileText, Users, Tag, Sparkles, Check, Package, LogOut, User, BarChart2, Mailbox, Download, Activity, Link as LinkIcon, ExternalLink, Layers
} from 'lucide-react';
import { supabase } from './supabase';
import { Orcamento, Cliente, EMPRESA, PRODUTOS, emptyOrcamento, SolicitacaoOrcamento, formatarCampoCliente } from './types';
import { calcularVolumesMultiProdutos } from './config/produtosLogisticos';
import { PrintView } from './components/PrintView';
import { ConfirmacaoCompraView } from './components/ConfirmacaoCompraView';
import { HistoricoModal } from './components/HistoricoModal';
import { ClientesModal } from './components/ClientesModal';
import { DashboardModal } from './components/DashboardModal';
import { FormaPlayBrand } from './components/FormaPlayBrand';
import { SolicitacoesModal } from './components/SolicitacoesModal';
import { ExportModal } from './components/ExportModal';
import { ProdutosModal } from './components/ProdutosModal';
import { TorreControleModal } from './components/TorreControleModal';
import { AssistenteNFeModal } from './components/AssistenteNFeModal';
import { ProducaoModal } from './components/ProducaoModal';
import { PainelProducaoModal } from './components/PainelProducaoModal';
import { PainelInteressesModal } from './components/PainelInteressesModal';
import { GerenciadorDocumentos } from './components/GerenciadorDocumentos';
import { useAuth } from './AuthWrapper';

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
        '1 Dado',
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
        '1 Dado',
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
  const [printMode, setPrintMode] = useState<'orcamento' | 'confirmacao'>('orcamento');
  const [historico, setHistorico] = useState<Orcamento[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showClientes, setShowClientes] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTorreControle, setShowTorreControle] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProdutos, setShowProdutos] = useState(false);
  const [showAssistenteNFe, setShowAssistenteNFe] = useState(false);
  const [showProducao, setShowProducao] = useState(false);
  const [showPainelProducao, setShowPainelProducao] = useState(false);
  const [showInteresses, setShowInteresses] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('Principal');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { usuarioApp } = useAuth();

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoOrcamento[]>([]);
  const [showSolicitacoes, setShowSolicitacoes] = useState(false);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);

  const [interessesNovosCount, setInteressesNovosCount] = useState(0);

  // Estados da Camada 2 (Rascunho)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [draftAlert, setDraftAlert] = useState<{ exists: boolean; savedAt: number | null }>({ exists: false, savedAt: null });
  const DRAFT_KEY = 'formaplay:draft-orcamento:v1';
  const savedFormRef = useRef<string>('');

  const [solicitacaoOrigemId, setSolicitacaoOrigemId] = useState<string | null>(null);

  useEffect(() => {
    savedFormRef.current = JSON.stringify(emptyOrcamento());
  }, []);

  // Detector universal de alterações
  useEffect(() => {
    const currentStr = JSON.stringify(form);
    if (currentStr !== savedFormRef.current) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [form]);

  // Salvar rascunho automaticamente
  useEffect(() => {
    if (hasUnsavedChanges && !draftAlert.exists) {
      const timer = setTimeout(() => {
        const draft = { version: 1, currentId, form, solicitacaoOrigemId, savedAt: Date.now() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [form, currentId, solicitacaoOrigemId, hasUnsavedChanges, draftAlert.exists]);

  const restaurarRascunho = () => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(parsed.form);
        setCurrentId(parsed.currentId);
        setSolicitacaoOrigemId(parsed.solicitacaoOrigemId || null);
      } catch {
        // Ignorar
      }
    }
    setDraftAlert({ exists: false, savedAt: null });
  };

  const descartarRascunho = () => {
    localStorage.removeItem(DRAFT_KEY);
    setSolicitacaoOrigemId(null);
    setDraftAlert({ exists: false, savedAt: null });
  };

  const [clienteData, setClienteData] = useState<Cliente | null>(null);

  const [loadingFrete, setLoadingFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);
  const [opcoesFrete, setOpcoesFrete] = useState<any[] | null>(null);
  const [freteSelecionado, setFreteSelecionado] = useState<any | null>(null);

  const calcularFreteApp = async () => {
    // Pegar o CEP (priorizar cliente vinculado, senao cliente_cep do form)
    const cepBruto = clienteData?.cep || form.cliente_cep;
    const cepDestinoNormalizado = cepBruto ? String(cepBruto).replace(/\D/g, '') : '';
    
    if (!cepDestinoNormalizado || cepDestinoNormalizado.length < 8) {
      setErroFrete("CEP do cliente não encontrado.");
      return;
    }

    setLoadingFrete(true);
    setErroFrete(null);
    setOpcoesFrete(null);
    setFreteSelecionado(null);

    try {
      const itensOrcamento = form.itens && form.itens.length > 0 ? form.itens : [{ nome: form.produto, quantidade: form.quantidade }];
      
      if (!itensOrcamento || itensOrcamento.length === 0 || !itensOrcamento[0].nome) {
        setErroFrete("Adicione um produto antes de calcular o frete.");
        setLoadingFrete(false);
        return;
      }

      const volumes = calcularVolumesMultiProdutos(itensOrcamento, []);

      console.log("DEBUG FRETE - cliente vinculado:", clienteData);
      console.log("DEBUG FRETE - cep destino:", cepDestinoNormalizado);
      console.log("DEBUG FRETE - produtos orçamento:", itensOrcamento);
      console.log("DEBUG FRETE - volumes:", volumes);

      if (!volumes || volumes.length === 0) {
        setErroFrete("Produto sem peso ou medidas cadastradas.");
        setLoadingFrete(false);
        return;
      }

      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cepDestino: cepDestinoNormalizado, volumes })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("DEBUG FRETE - Erro API (Status HTTP):", res.status);
        console.error("DEBUG FRETE - Resposta de erro:", errorData);
        throw new Error(errorData.error || errorData.details || 'Falha na API de frete');
      }

      const data = await res.json();
      console.log("DEBUG FRETE - resposta completa da API:", data);
      
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a, b) => a.price - b.price);
        setOpcoesFrete(data);
      } else {
        throw new Error('Sem opções de frete retornadas.');
      }
    } catch (err: any) {
      console.error("DEBUG FRETE - Exceção capturada:", err);
      if (err.message === 'Produto sem peso ou medidas cadastradas.') {
        setErroFrete("Produto sem peso ou medidas cadastradas.");
      } else {
        setErroFrete(err.message || "Não foi possível calcular o frete automaticamente. Confirme manualmente.");
      }
    } finally {
      setLoadingFrete(false);
    }
  };

  const parseMoeda = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
    // Se tiver mais de um ponto (ex: 1.000.50), pega o último como decimal
    const parts = str.split('.');
    if (parts.length > 2) {
      const dec = parts.pop();
      return parseFloat(parts.join('') + '.' + dec) || 0;
    }
    return parseFloat(str) || 0;
  };

  const handleSelecionarFrete = (opcao: any) => {
    const freteSelecionado = parseMoeda(opcao.price);
    
    setFreteSelecionado(opcao);
    setForm(prev => {
      const subtotal = prev.itens && Array.isArray(prev.itens) && prev.itens.length > 0 
        ? prev.itens.reduce((acc, item) => acc + (parseMoeda(item.subtotal) || 0), 0)
        : parseMoeda(prev.quantidade || 0) * parseMoeda(prev.valor_unitario || 0);
        
      const desconto = parseMoeda(prev.desconto);
      const novoTotal = subtotal + freteSelecionado - desconto;

      console.log("DEBUG TOTAL FRETE", { subtotal, freteSelecionado, desconto, novoTotal });

      return {
        ...prev,
        frete: freteSelecionado,
        total: novoTotal,
        observacao_frete: `${opcao.company} - ${opcao.name} (${opcao.delivery_time} dias úteis). Frete calculado com base no CEP ${clienteData?.cep || prev.cliente_cep}. Endereço completo de entrega será confirmado no fechamento do pedido.`
      };
    });
  };

  const converterSolicitacao = async (s: SolicitacaoOrcamento) => {
    // Mapeamento seguro de nomes do formulário público para o orçamento interno
    const mapNomeProduto = (nome: string) => {
      if (nome === 'Edição do Professor') return 'Edição Professor';
      if (nome === 'Desafio Premium') return 'Desafio Logístico Premium';
      return nome;
    };
    
    const temItens = s.itens && Array.isArray(s.itens) && s.itens.length > 0;
    const numeroAtual = form.numero || await calcularNumeroOrcamento();
    
    let infoComple = `Origem: Solicitação pública ${s.codigo}`;
    if (s.embrulho_presente) {
      infoComple += `\nEmbrulho para presente: SIM`;
    }

    const enderecoCompleto = s.endereco 
      ? `${s.endereco}, ${s.numero || 'S/N'}${s.complemento ? `, ${s.complemento}` : ''}, ${s.bairro || ''}, ${s.cidade || ''}/${s.estado || ''} - CEP ${s.cep || ''}`
      : '';

    let novo: any;

    if (temItens) {
      const totalItensQtd = s.itens!.reduce((acc, item) => acc + (item.quantidade || 0), 0);
      const subtotalProdutos = s.itens!.reduce((acc, item) => acc + (item.subtotal || 0), 0);
      const valorUnitarioMedio = totalItensQtd > 0 ? (subtotalProdutos / totalItensQtd) : 0;

      novo = {
        ...emptyOrcamento(),
        numero: numeroAtual,
        data_orcamento: form.data_orcamento || new Date().toLocaleDateString('pt-BR'),
        cliente: s.nome_razao,
        telefone: s.telefone,
        email: s.email || '',
        cidade: `${s.cidade || ''}/${s.estado || ''}`,
        produto: s.jogo_escolhido,
        quantidade: totalItensQtd,
        valor_unitario: valorUnitarioMedio,
        frete: s.frete_estimado || 0,
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
        itens: s.itens,
      };
    } else {
      const nomeNormalizado = mapNomeProduto(s.jogo_escolhido);
      const produtoEncontrado = PRODUTOS.find((p) => p.nome === nomeNormalizado);
      
      let unitPrice = produtoEncontrado?.preco || 0;
      if (unitPrice === 0 && s.valor_estimado > 0 && s.quantidade > 0) {
        unitPrice = s.valor_estimado / s.quantidade;
      }

      novo = {
        ...emptyOrcamento(),
        numero: numeroAtual,
        data_orcamento: form.data_orcamento || new Date().toLocaleDateString('pt-BR'),
        cliente: s.nome_razao,
        telefone: s.telefone,
        email: s.email || '',
        cidade: `${s.cidade || ''}/${s.estado || ''}`,
        produto: produtoEncontrado ? nomeNormalizado : '',
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
    }
    
    if (s.forma_pagamento === 'Pix com desconto') {
      novo.desconto = s.desconto_pix;
    }

    setForm(calcularValores(novo));
    setCurrentId(null);
    setSolicitacaoOrigemId(s.id);
    setShowSolicitacoes(false);
    showToast('success', 'Dados da solicitação preenchidos. Revise e clique em Salvar Orçamento.');
  };

  const carregarSolicitacoes = async () => {
    setLoadingSolicitacoes(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_orcamento')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro do Supabase ao carregar solicitações:", error);
      }
      if (data) {
        setSolicitacoes(data as SolicitacaoOrcamento[]);
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar solicitações:", err);
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  const carregarInteressesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('interesses_modelos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'novo')
        .eq('arquivado', false)
        .eq('origem', 'site_formaplay');
      
      if (!error && count !== null) {
        setInteressesNovosCount(count);
      }
    } catch (err) {
      console.error("Erro ao carregar contagem de interesses:", err);
    }
  };

  useEffect(() => {
    carregarSolicitacoes();
    carregarInteressesCount();

    const onFocus = () => {
      carregarInteressesCount();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const showToast = (type: Toast['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const calcularNumeroOrcamento = async (): Promise<string> => {
    // A numeração agora é gerada automaticamente pelo banco de dados via Sequence e Trigger
    return '';
  };

  const calcularValores = (f: Omit<Orcamento, 'id' | 'created_at'>) => {
    const temItens = f.itens && Array.isArray(f.itens) && f.itens.length > 0;
    const subtotal = temItens
      ? f.itens!.reduce((acc, item) => acc + parseMoeda(item.subtotal), 0)
      : parseMoeda(f.quantidade) * parseMoeda(f.valor_unitario);
    const total = subtotal + parseMoeda(f.frete) - parseMoeda(f.desconto);
    return {
      ...f,
      subtotal: isNaN(subtotal) ? 0 : subtotal,
      total: isNaN(total) ? 0 : total,
    };
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const finalValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    const numeric = ['quantidade', 'valor_unitario', 'frete', 'desconto'];

    const updated = {
      ...form,
      [name]: numeric.includes(name) ? parseMoeda(value) : finalValue,
    };

    if (name === 'produto') {
      const produto = PRODUTOS.find((p) => p.nome === value);
      if (produto) {
        updated.valor_unitario = produto.preco;
      }
    }
    
    // Regras de automação do Acompanhamento Público
    if (name === 'status_acompanhamento') {
      updated.status_atualizado_em = new Date().toISOString();
    }
    
    if (name === 'nf_emitida' && finalValue === true) {
      if (!updated.status_acompanhamento) {
        updated.status_acompanhamento = 'Nota fiscal emitida';
        updated.status_atualizado_em = new Date().toISOString();
      }
    }

    setForm(calcularValores(updated));
  };

  const gerarLinkAcompanhamento = async () => {
    if (!currentId) {
      showToast('error', 'Por favor, salve o orçamento primeiro para gerar o link público.');
      return;
    }

    let token = form.token_publico;
    if (!token) {
      token = `fp_${crypto.randomUUID()}`;
      const payload = { ...form, token_publico: token };
      setForm(calcularValores(payload));
      
      // Atualiza direto no banco
      await supabase
        .from('orcamentos')
        .update({ token_publico: token })
        .eq('id', currentId);
    }
    
    if (token) {
      const link = `${window.location.origin}/acompanhar-pedido/${token}`;
      try {
        await navigator.clipboard.writeText(link);
        showToast('success', 'Link copiado. A página pública será ativada na próxima fase.');
      } catch (err) {
        showToast('success', 'Token gerado! Não foi possível copiar para a área de transferência automaticamente.');
      }
    }
  };

  const carregarHistorico = useCallback(async () => {
    setLoadingHistorico(true);
    try {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro do Supabase ao carregar histórico:", error);
      }
      if (data) {
        setHistorico(data as Orcamento[]);
      }
    } catch (err) {
      console.error("Erro inesperado ao carregar histórico:", err);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await carregarHistorico();
      // Busca o próximo número correto ao iniciar o app
      const numero = await calcularNumeroOrcamento();
      setForm((prev) => {
        const novo = { ...prev, numero };
        // Atualizar o rascunho base apenas se o form ainda não sofreu outras edições
        if (savedFormRef.current === JSON.stringify(prev)) {
          savedFormRef.current = JSON.stringify(novo);
        }
        return novo;
      });

      // Carregar rascunho na inicialização
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.savedAt && Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(DRAFT_KEY);
          } else if (parsed.version === 1 && parsed.form) {
            setDraftAlert({ exists: true, savedAt: parsed.savedAt });
          }
        } catch (e) {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    };
    init();
  }, [carregarHistorico]);

  const novoOrcamento = async () => {
    if (hasUnsavedChanges || currentId) {
      const confirmar = window.confirm(
        'Você tem alterações não salvas ou está editando um orçamento. Deseja descartar as alterações e iniciar um novo orçamento?'
      );
      if (!confirmar) return;
    }
    const novo = {
      ...emptyOrcamento(),
      numero: '',
      data_orcamento: new Date().toLocaleDateString('pt-BR'),
    };
    setForm(novo);
    savedFormRef.current = JSON.stringify(novo);
    setCurrentId(null);
    setClienteData(null);
    localStorage.removeItem(DRAFT_KEY);
    setDraftAlert({ exists: false, savedAt: null });
  };

  const salvarOrcamento = async () => {
    if (!form.cliente.trim()) {
      showToast('error', 'Informe o nome do cliente antes de salvar.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      
      // Normalizar campos de data vazios para null
      const dateFields = ['nf_emitida_em', 'status_atualizado_em', 'data_retorno'];
      dateFields.forEach(field => {
        if (payload[field] === "" || payload[field] === undefined) {
          payload[field] = null;
        }
      });

      let savedOrcamentoId = currentId;

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
        const payloadToInsert = { ...payload };
        // Deixa o banco de dados gerar o número
        delete payloadToInsert.numero;
        
        const { data, error } = await supabase
          .from('orcamentos')
          .insert(payloadToInsert)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (data) {
          savedOrcamentoId = (data as Orcamento).id ?? null;
          setCurrentId(savedOrcamentoId);
          const updatedForm = { ...payloadToInsert, numero: (data as Orcamento).numero };
          setForm(updatedForm);
          savedFormRef.current = JSON.stringify(updatedForm);
        }
        showToast('success', 'Orçamento salvo com sucesso!');
      }

      localStorage.removeItem(DRAFT_KEY);

      if (solicitacaoOrigemId && !currentId && savedOrcamentoId) {
        const { error: solError } = await supabase
          .from('solicitacoes_orcamento')
          .update({ status: 'Convertida', orcamento_id: savedOrcamentoId })
          .eq('id', solicitacaoOrigemId);
        
        if (solError) {
          console.error('[salvar] Erro ao vincular solicitação:', solError);
          showToast('error', 'Orçamento salvo, mas não foi possível atualizar a solicitação de origem. Verifique a Inbox.');
        } else {
          setSolicitacaoOrigemId(null);
          await carregarSolicitacoes();
        }
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
      itens: Array.isArray(rest.itens) ? rest.itens : [],
      producao_checklist: Array.isArray(rest.producao_checklist) ? rest.producao_checklist : [],
    };
    const valores = calcularValores(normalized);
    setForm(valores);
    savedFormRef.current = JSON.stringify(valores);
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
      const vazio = emptyOrcamento();
      setForm(vazio);
      savedFormRef.current = JSON.stringify(vazio);
      setCurrentId(null);
      localStorage.removeItem(DRAFT_KEY);
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

  const imprimirConfirmacaoCompra = () => {
    setPrintMode('confirmacao');
    
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

    const numLimpo = (form.numero || 'S-N').replace(/#/g, '');
    const produtoBase = (form.produto || '').split(' - ')[0];
    
    let fileName = `Confirmacao_Compra_${numLimpo}`;
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
        setPrintMode('orcamento');
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

  const copiarMensagemConfirmacao = async () => {
    const nomeProduto = form.produto ? form.produto.split(' - ')[0] : 'referente ao orçamento aprovado';
    const mensagem = `Olá, tudo bem?\n\nConforme aprovação do orçamento, segue em anexo a Confirmação de Compra referente ao jogo ${nomeProduto}.\n\nO documento reúne os dados do pedido, produto, quantidade, valores, prazo de entrega, forma de pagamento e emissão de Nota Fiscal, para registro e conferência.\n\nA FormaPlay fica à disposição para qualquer ajuste ou informação adicional.`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(mensagem);
        showToast('success', 'Mensagem de confirmação copiada com sucesso.');
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error) {
      showToast('error', 'Não foi possível copiar a mensagem. Copie manualmente.');
    }
  };

  const copiarAcompanhamento = async () => {
    if (!currentId) {
      showToast('error', 'Salve o orçamento antes de gerar o link de acompanhamento.');
      return;
    }

    let token = form.token_publico;
    if (!token) {
      token = `fp_${crypto.randomUUID()}`;
      const payload = { ...form, token_publico: token };
      setForm(calcularValores(payload));
      
      // Atualiza direto no banco
      await supabase
        .from('orcamentos')
        .update({ token_publico: token })
        .eq('id', currentId);
    }
    
    if (token) {
      const baseUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'https://formaplay-orcamento.vercel.app'
        : window.location.origin;
      const link = `${baseUrl}/acompanhar-pedido/${token}`;
      
      const tituloPedido = form.numero ? `Pedido ${form.numero}` : 'Pedido FormaPlay';
      const mensagem = `${tituloPedido} — acompanhamento:\n${link}`;
      
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(mensagem);
          showToast('success', 'Mensagem de acompanhamento copiada com sucesso.');
        } else {
          throw new Error('Clipboard API not available');
        }
      } catch (error) {
        showToast('error', 'Não foi possível copiar a mensagem. Copie manualmente.');
      }
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
        {printMode === 'orcamento' ? (
          <PrintView orcamento={{ ...form, id: currentId ?? undefined }} clienteData={clienteData} />
        ) : (
          <ConfirmacaoCompraView orcamento={{ ...form, id: currentId ?? undefined }} clienteData={clienteData} />
        )}
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
          {/* Draft Alert */}
          {draftAlert.exists && (
            <div className="bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-900/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-amber-400 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-amber-400 font-bold">Rascunho não salvo encontrado</h3>
                  <p className="text-slate-300 text-sm">
                    Encontramos alterações não salvas de uma edição anterior ({new Date(draftAlert.savedAt!).toLocaleString('pt-BR')}).
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={restaurarRascunho}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  Restaurar rascunho
                </button>
                <button
                  onClick={descartarRascunho}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

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
          {/* Menu de Ações Unificado (Desktop Tabs / Mobile Dropdown) */}
          <div className="sticky top-0 z-50 bg-[#0f172a] pt-3 pb-2 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0 sm:m-0 sm:z-40">
            {/* Botão Mobile */}
            <div className="sm:hidden mb-2">
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-900 to-slate-900 rounded-xl shadow-lg border border-slate-700 text-white font-bold"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">☰</span> 
                  Ações do Pedido
                </div>
                <ChevronDown className={`transition-transform duration-300 ${showMobileMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Container das Abas (Desktop: normal, Mobile: dropdown se showMobileMenu = true) */}
            <div className={`${showMobileMenu ? 'block absolute top-full left-0 right-0 mt-2' : 'hidden'} sm:relative sm:block sm:mt-0 bg-[#0f172a] rounded-xl sm:rounded-2xl shadow-2xl sm:shadow-xl border border-slate-700 sm:border-slate-800 p-4 sm:p-5 overflow-hidden z-50`}>
              {/* Cabeçalho das Abas */}
              <div className="flex gap-2 border-b border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
                {['Principal', 'Gestão', 'Controle', 'Dados', 'Comunicação'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Barra de Ações Persistente do Orçamento */}
              <div 
                className={`pt-4 flex flex-col sm:flex-row flex-wrap gap-3 [&>button]:w-full sm:[&>button]:w-auto [&>button]:justify-center sm:[&>button]:justify-start ${activeTab !== 'Principal' ? 'pb-4 border-b border-slate-800/50 mb-4' : ''}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) {
                    setShowMobileMenu(false);
                  }
                }}
              >
                <button onClick={novoOrcamento} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-lg hover:from-blue-800 hover:to-blue-700 active:scale-95 transition-all font-bold text-sm shadow-md">
                  <Plus size={18} /> Novo Orçamento
                </button>
                {hasUnsavedChanges && (
                  <span className="hidden sm:inline-flex items-center text-amber-400 text-xs font-bold px-2 py-1 bg-amber-900/30 border border-amber-500/30 rounded-lg">
                    Alterações não salvas
                  </span>
                )}
                {!hasUnsavedChanges && currentId && (
                  <span className="hidden sm:inline-flex items-center text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-900/30 border border-emerald-500/30 rounded-lg">
                    Salvo
                  </span>
                )}
                <button onClick={salvarOrcamento} disabled={saving} className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-lg active:scale-95 transition-all font-bold text-sm shadow-md disabled:opacity-60 ${currentId ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'}`}>
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                  {currentId ? 'Atualizar Orçamento' : 'Salvar'}
                </button>
                <button onClick={imprimirOrcamento} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-lg hover:from-blue-800 hover:to-blue-900 active:scale-95 transition-all font-bold text-sm shadow-md">
                  <Printer size={18} /> PDF
                </button>
                <button onClick={imprimirConfirmacaoCompra} disabled={form.status !== 'Aprovado'} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-md ${form.status === 'Aprovado' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`} title={form.status !== 'Aprovado' ? 'Disponível após aprovação' : 'Gerar Confirmação de Compra'}>
                  <FileText size={18} /> {form.status !== 'Aprovado' ? 'Disponível após aprovação' : 'Confirmação de Compra'}
                </button>
                <button onClick={enviarWhatsApp} className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#1ebe5d] active:scale-95 transition-all font-bold text-sm shadow-md">
                  <MessageCircle size={18} /> Enviar WhatsApp
                </button>
                <button onClick={duplicarOrcamento} disabled={!currentId} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-sm border ${!currentId ? 'bg-slate-800 text-gray-400 border-slate-700 cursor-not-allowed' : 'bg-purple-900/30 text-purple-300 border-purple-500/50 hover:bg-purple-900/50'}`} title="Duplicar este orçamento">
                  <CopyPlus size={18} /> Duplicar orçamento
                </button>
              </div>

              {/* Ações Específicas da Aba */}
              {activeTab !== 'Principal' && (
                <div 
                  className="flex flex-col sm:flex-row flex-wrap gap-3 [&>button]:w-full sm:[&>button]:w-auto [&>button]:justify-center sm:[&>button]:justify-start"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) {
                      setShowMobileMenu(false);
                    }
                  }}
                >
                  {activeTab === 'Comunicação' && (
                    <>
                      <button onClick={copiarMensagem} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-sm">
                        <Copy size={18} /> Copiar mensagem
                      </button>
                      {form.status === 'Aprovado' && (
                        <button onClick={copiarMensagemConfirmacao} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-emerald-400 hover:text-white hover:bg-emerald-700 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-sm">
                          <Copy size={18} /> Copiar mensagem confirmação
                        </button>
                      )}
                      <button onClick={copiarAcompanhamento} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-indigo-400 hover:text-white hover:bg-indigo-700 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-sm">
                        <LinkIcon size={18} /> Copiar acompanhamento
                      </button>
                    </>
                  )}

                  {activeTab === 'Gestão' && (
                    <>
                      <button onClick={() => { setShowHistorico(true); carregarHistorico(); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <FolderOpen size={18} /> Histórico
                        {historico.length > 0 && <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">{historico.length}</span>}
                      </button>
                      <button onClick={() => { setShowSolicitacoes(true); carregarSolicitacoes(); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 rounded-lg hover:bg-indigo-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <Mailbox size={18} /> Solicitações
                        {solicitacoes.filter(s => s.status === 'Pendente').length > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">{solicitacoes.filter(s => s.status === 'Pendente').length}</span>}
                      </button>
                      <button onClick={() => setShowClientes(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <User size={18} /> Clientes
                      </button>
                      <button onClick={() => setShowProdutos(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/10 rounded-lg hover:bg-indigo-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <Package size={18} /> Produtos
                      </button>
                      {(usuarioApp?.perfil === 'administrador' || usuarioApp?.perfil === 'comercial') && (
                        <button onClick={() => setShowInteresses(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-teal-400 hover:border-teal-500/50 hover:bg-teal-500/10 rounded-lg active:scale-95 transition-all font-bold text-sm shadow-md">
                          <Users size={18} /> Interesses
                          {interessesNovosCount > 0 && <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1 animate-pulse">{interessesNovosCount}</span>}
                        </button>
                      )}
                    </>
                  )}

                  {activeTab === 'Controle' && (
                    <>
                      <button onClick={() => { setShowDashboard(true); carregarHistorico(); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/10 rounded-lg hover:bg-blue-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <BarChart2 size={18} /> Painel Comercial
                      </button>
                      <button onClick={() => setShowTorreControle(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-800 text-white rounded-lg hover:bg-slate-700 hover:border-slate-700 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <Activity size={18} className="text-orange-400" /> Torre de Controle
                      </button>
                      <button onClick={() => {
                        if (!currentId) {
                          showToast('error', 'Salve o orçamento antes de abrir a ordem de produção.');
                        } else {
                          setShowProducao(true);
                        }
                      }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <Package size={18} /> Ordem de Produção
                      </button>
                      <button onClick={() => setShowPainelProducao(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border-2 border-slate-700 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <Layers size={18} /> Painel de Produção
                      </button>
                    </>
                  )}

                  {activeTab === 'Dados' && (
                    <>
                      <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#217346] border-2 border-[#217346] text-white rounded-lg hover:bg-[#1e6b41] hover:border-[#1e6b41] active:scale-95 transition-all font-bold text-sm shadow-md whitespace-nowrap">
                        <Download size={18} /> Exportar Dados
                      </button>
                      <button onClick={limparHistorico} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition-all font-bold text-sm shadow-md">
                        <RotateCcw size={18} /> Limpar Histórico
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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

                {(clienteData || form.cliente_nome) && (
                  <div className="mb-6 p-4 bg-slate-900/50 border border-emerald-500/20 rounded-xl text-sm text-slate-300 shadow-inner">
                    <div className="mb-3 border-b border-emerald-500/20 pb-2">
                      <p className="font-bold text-emerald-400 flex items-center gap-2">
                        Cliente Vinculado ao Orçamento
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {clienteData ? "Dados atuais do cadastro do cliente vinculado." : "Dados carregados do cadastro do cliente."}
                      </p>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <p><strong className="text-slate-400">Razão Social/Nome:</strong> {formatarCampoCliente(clienteData?.razao_social || clienteData?.nome || form.cliente_razao_social || form.cliente_nome)}</p>
                      <p><strong className="text-slate-400">Fantasia:</strong> {formatarCampoCliente(clienteData?.nome_fantasia || form.cliente_nome_fantasia)}</p>
                      <p><strong className="text-slate-400">Documento:</strong> {formatarCampoCliente(clienteData?.documento || form.cliente_documento)}</p>
                      <p><strong className="text-slate-400">Contato:</strong> {formatarCampoCliente(clienteData?.contato_responsavel || form.cliente_contato_responsavel)}</p>
                      <p><strong className="text-slate-400">Telefone:</strong> {formatarCampoCliente(clienteData?.telefone || form.cliente_telefone || form.telefone)}</p>
                      <p><strong className="text-slate-400">E-mail:</strong> {formatarCampoCliente(clienteData?.email || form.cliente_email || form.email)}</p>
                      <p><strong className="text-slate-400">Endereço:</strong> {
                        formatarCampoCliente(clienteData 
                          ? `${clienteData.endereco || ''}, ${clienteData.numero || 'S/N'}${clienteData.complemento ? ' - ' + clienteData.complemento : ''} - ${clienteData.bairro || ''} - ${clienteData.cidade || ''}/${clienteData.estado || ''} - CEP: ${clienteData.cep || ''}`
                          : form.cliente_endereco_completo)
                      }</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="form-label">Cliente *</label>
                    <input name="cliente" value={clienteData ? formatarCampoCliente(clienteData.nome) : form.cliente} onChange={handleChange}
                      className={`form-input ${clienteData ? 'cursor-not-allowed opacity-70' : ''}`} readOnly={!!clienteData} placeholder="Nome completo ou razão social" />
                  </div>
                  <div>
                    <label className="form-label">Telefone</label>
                    <input name="telefone" value={clienteData ? formatarCampoCliente(clienteData.telefone) : form.telefone} onChange={handleChange}
                      className={`form-input ${clienteData ? 'cursor-not-allowed opacity-70' : ''}`} readOnly={!!clienteData} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="form-label">Cidade/UF</label>
                    <input name="cidade" value={clienteData ? formatarCampoCliente(`${clienteData.cidade || ''}/${clienteData.estado || ''}`) : form.cidade} onChange={handleChange}
                      className={`form-input ${clienteData ? 'cursor-not-allowed opacity-70' : ''}`} readOnly={!!clienteData} placeholder="Ex: São Paulo/SP" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">E-mail</label>
                    <input name="email" type="text" value={clienteData ? formatarCampoCliente(clienteData.email) : formatarCampoCliente(form.email)} onChange={handleChange}
                      className={`form-input ${clienteData ? 'cursor-not-allowed opacity-70' : ''}`} readOnly={!!clienteData} placeholder="cliente@email.com" />
                  </div>
                </div>
              </div>

              {/* Product */}
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-green-500 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 text-white text-xs font-bold flex items-center justify-center">2</span>
                  Jogo / Produto
                </h2>
                {form.itens && Array.isArray(form.itens) && form.itens.length > 1 ? (
                  <div className="space-y-4">
                    <div className="bg-blue-950/40 border border-blue-900 text-blue-300 p-4 rounded-xl text-xs flex items-start gap-2">
                      <span className="text-base leading-none">ℹ️</span>
                      <p>Este orçamento é composto por múltiplos produtos importados de uma solicitação pública. A alteração individual de produtos estará disponível em atualizações futuras. Descontos e frete geral podem ser editados na seção seguinte.</p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#070b14]">
                      <table className="w-full text-left text-xs text-slate-300 border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                            <th className="px-4 py-3">Produto</th>
                            <th className="px-4 py-3">SKU / Revisão</th>
                            <th className="px-4 py-3 text-center">Qtd</th>
                            <th className="px-4 py-3 text-right">Unitário</th>
                            <th className="px-4 py-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {form.itens.map((item, idx) => (
                            <tr key={item.sku || idx} className="hover:bg-slate-900/30">
                              <td className="px-4 py-3 font-bold text-white">{item.nome}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{item.sku}{item.revisao ? ` ${item.revisao}` : ''}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-200">{item.quantidade}</td>
                              <td className="px-4 py-3 text-right">{fmtCurrency(item.valor_unitario)}</td>
                              <td className="px-4 py-3 text-right font-semibold text-emerald-400">{fmtCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="form-label">Quantidade Total (Legada)</label>
                        <input value={form.quantidade} readOnly
                          className="form-input bg-blue-950/60 border-blue-800 text-blue-300 cursor-not-allowed font-semibold" />
                      </div>
                      <div>
                        <label className="form-label">Subtotal Geral</label>
                        <input value={fmtCurrency(form.subtotal)} readOnly
                          className="form-input bg-blue-950/60 border-blue-800 text-blue-300 cursor-not-allowed font-semibold" />
                      </div>
                    </div>
                  </div>
                ) : (
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
                )}
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

              {/* Public Tracking / Status Público */}
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500 p-6 relative overflow-hidden mt-5">
                <h2 className="font-black text-slate-100 mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-bold flex items-center justify-center">5</span>
                  Status do Pedido para o Cliente
                </h2>
                <p className="text-xs text-emerald-400 font-semibold mb-5 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                  Visível para o cliente no link de acompanhamento público.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                  <div className="sm:col-span-2">
                    <label className="form-label">Status de Acompanhamento Público</label>
                    <div className="relative">
                      <select name="status_acompanhamento" value={form.status_acompanhamento || ''} onChange={handleChange}
                        className="form-input appearance-none pr-10 font-bold text-emerald-400">
                        <option value="">Nenhum (Inativo)</option>
                        <option value="Solicitação recebida">Solicitação recebida</option>
                        <option value="Orçamento enviado">Orçamento enviado</option>
                        <option value="Aguardando confirmação do cliente">Aguardando confirmação do cliente</option>
                        <option value="Aguardando pagamento ou autorização">Aguardando pagamento/autorização de compra</option>
                        <option value="Pagamento/autorização aprovado">Pedido autorizado para produção</option>
                        <option value="Pedido em produção">Pedido em produção</option>
                        <option value="Nota fiscal emitida">Nota fiscal emitida</option>
                        <option value="Pedido em fase de entrega">Pedido em fase de entrega</option>
                        <option value="Pedido entregue">Pedido entregue</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Observação Pública</label>
                    <textarea name="observacao_publica_status" value={form.observacao_publica_status || ''} onChange={handleChange}
                      rows={2} className="form-input resize-none"
                      placeholder="Mensagem opcional que o cliente verá nesta etapa..." />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Última Atualização</label>
                    <input name="status_atualizado_em" value={form.status_atualizado_em ? new Date(form.status_atualizado_em).toLocaleString('pt-BR') : 'Sem atualização'} readOnly
                      className="form-input bg-slate-900/50 text-slate-400 border-slate-800" />
                  </div>
                  
                  <div className="sm:col-span-2 mt-2 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h3 className="font-bold text-emerald-500 text-sm">Dados da Nota Fiscal (Opcional)</h3>
                    <button
                      type="button"
                      title="Abrir Assistente NF-e"
                      onClick={() => setShowAssistenteNFe(true)}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-bold transition-all border border-blue-500/30"
                    >
                      <ExternalLink size={14} />
                      Preparar NF-e no Sebrae
                    </button>
                  </div>
                  
                  <div className="sm:col-span-2 flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      name="nf_emitida" 
                      id="nf_emitida"
                      checked={form.nf_emitida || false} 
                      onChange={handleChange}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="nf_emitida" className="text-sm font-bold text-slate-300">Nota Fiscal Emitida</label>
                  </div>
                  <div>
                    <label className="form-label">Número da NF</label>
                    <input name="nf_numero" value={form.nf_numero || ''} onChange={handleChange}
                      className="form-input" placeholder="Ex: 1234" />
                  </div>
                  <div>
                    <label className="form-label">Data de Emissão (NF)</label>
                    <input name="nf_emitida_em" type="date" value={form.nf_emitida_em || ''} onChange={handleChange}
                      className="form-input" />
                  </div>
                  
                  <div className="sm:col-span-2 mt-4">
                    <button
                      type="button"
                      onClick={gerarLinkAcompanhamento}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                    >
                      <LinkIcon size={18} />
                      Gerar / Copiar Link de Acompanhamento
                    </button>
                    {form.token_publico && (
                      <p className="text-xs text-center text-emerald-400 mt-2 font-medium">
                        Token gerado: {form.token_publico}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Documentos do Pedido */}
              {currentId && usuarioApp && (
                <GerenciadorDocumentos
                  orcamentoId={currentId}
                  perfilUsuario={usuarioApp.perfil}
                />
              )}

              {/* Entrega e Rastreamento */}
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-indigo-500 p-6 relative overflow-hidden mt-5">
                <h2 className="font-black text-slate-100 mb-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-xs font-bold flex items-center justify-center">6</span>
                  Entrega e Rastreamento
                </h2>
                <p className="text-xs text-indigo-400 font-semibold mb-5 bg-indigo-950/30 p-2 rounded border border-indigo-900/50">
                  Estes dados também ficarão visíveis para o cliente no acompanhamento.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="form-label">Transportadora</label>
                    <input name="transportadora" value={form.transportadora || ''} onChange={handleChange}
                      className="form-input" placeholder="Ex: Correios, Jadlog..." />
                  </div>
                  <div>
                    <label className="form-label">Código de Rastreio</label>
                    <input name="codigo_rastreio" value={form.codigo_rastreio || ''} onChange={handleChange}
                      className="form-input" placeholder="Ex: BR123456789" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Link de Rastreamento</label>
                    <input name="link_rastreio" type="url" value={form.link_rastreio || ''} onChange={handleChange}
                      className="form-input" placeholder="Ex: https://..." />
                  </div>
                  <div>
                    <label className="form-label">Data de Envio</label>
                    <input name="data_envio" type="date" value={form.data_envio || ''} onChange={handleChange}
                      className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Previsão de Entrega</label>
                    <input name="previsao_entrega" type="date" value={form.previsao_entrega || ''} onChange={handleChange}
                      className="form-input" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Observação da Entrega</label>
                    <textarea name="observacao_entrega_publica" value={form.observacao_entrega_publica || ''} onChange={handleChange}
                      rows={2} className="form-input resize-none"
                      placeholder="Informações adicionais para o cliente sobre o envio..." />
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
                      value={currentId ? form.numero : 'Gerado ao salvar'}
                      readOnly={true}
                      className={`form-input font-bold cursor-not-allowed opacity-80 ${
                        currentId
                          ? 'text-amber-400 bg-amber-950/50 border border-amber-900'
                          : 'text-green-400 bg-green-950/50 border border-green-900'
                      }`}
                      title={currentId ? 'O número não pode ser alterado' : 'O número será gerado automaticamente ao salvar'}
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

              {/* Resumo de Prioridade e Prazo */}
              {(() => {
                if (!currentId) return null;
                const prioridade = form.prioridade_producao || 'Normal';
                const prazo = form.prazo_producao;
                let prazoStatus = 'Sem prazo definido';
                
                const dt = new Date();
                const hojeStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                
                if (prazo) {
                  if (prazo < hojeStr) prazoStatus = 'Atrasado';
                  else if (prazo === hojeStr) prazoStatus = 'Vence hoje';
                  else prazoStatus = 'No prazo';
                }

                const formatPrazo = (iso: string) => {
                  const parts = iso.split('-');
                  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                  return iso;
                };

                return (
                  <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-amber-500 p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-black text-slate-100 flex items-center gap-2">
                        <Package size={18} className="text-amber-400" />
                        Prioridade e Prazo
                      </h2>
                      <button onClick={() => setShowProducao(true)} className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/50 hover:bg-amber-900/50 border border-amber-900/50 px-2 py-1 rounded transition-colors flex items-center gap-1">
                        <ExternalLink size={12} />
                        Editar
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prioridade Interna</p>
                        <div>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${
                            prioridade === 'Urgente' ? 'bg-rose-900/50 text-rose-400 border-rose-700/50' :
                            prioridade === 'Alta' ? 'bg-amber-900/50 text-amber-400 border-amber-700/50' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {prioridade}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prazo Interno</p>
                        <p className="font-bold text-white text-sm mb-1">{prazo ? formatPrazo(prazo) : 'Sem prazo definido'}</p>
                        <span className={`text-[10px] font-bold ${
                          prazoStatus === 'Atrasado' ? 'text-rose-400' :
                          prazoStatus === 'Vence hoje' ? 'text-amber-400' :
                          prazoStatus === 'No prazo' ? 'text-emerald-400' :
                          'text-slate-500'
                        }`}>
                          {prazoStatus}
                        </span>
                      </div>
                    </div>
                    
                    {form.observacao_prioridade && (
                      <div className="mt-4 bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                        <p className="text-[11px] text-slate-400 leading-tight">
                          <span className="font-bold text-slate-500">Obs.:</span> {form.observacao_prioridade}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Resumo da Produção */}
              {(() => {
                if (!currentId) return null;
                const totalProducao = 17;
                const concluidoProducao = Array.isArray(form.producao_checklist) ? form.producao_checklist.length : 0;
                const producaoPercent = Math.round((concluidoProducao / totalProducao) * 100);
                
                return (
                  <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-emerald-500 p-6 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-black text-slate-100 flex items-center gap-2">
                        <Package size={18} className="text-emerald-400" />
                        Ficha de Produção
                      </h2>
                      <button onClick={() => setShowProducao(true)} className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-900/50 px-2 py-1 rounded transition-colors flex items-center gap-1">
                        <ExternalLink size={12} />
                        Abrir
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status da Produção</p>
                        <p className="font-bold text-white text-sm">{form.status_producao || 'Não iniciada'}</p>
                      </div>
                      
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso</p>
                          <p className="text-[10px] font-bold text-emerald-400">{producaoPercent}%</p>
                        </div>
                        <p className="font-bold text-white text-sm mb-2">{concluidoProducao} de {totalProducao} itens concluídos</p>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${producaoPercent}%` }} />
                        </div>
                      </div>
                      
                      {form.producao_atualizado_em && (
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Última Atualização</p>
                          <p className="text-xs font-medium text-slate-300">{new Date(form.producao_atualizado_em).toLocaleString('pt-BR')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

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
              <div className="bg-[#0f172a] rounded-xl shadow-xl border border-slate-800 border-l-4 border-l-green-500 p-6 relative overflow-hidden">
                <h2 className="font-black text-slate-100 mb-5 text-lg">Resumo Financeiro</h2>
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Frete selecionado/salvo (R$)</label>
                    <input name="frete" type="number" min="0" step="0.01" value={form.frete} onChange={handleChange}
                      className="form-input mb-3" />
                    
                    {/* Botão SuperFrete */}
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={calcularFreteApp}
                          disabled={loadingFrete || (!clienteData?.cep && !form.cliente_cep)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 active:scale-95 transition-all font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {loadingFrete ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                          {loadingFrete ? 'Calculando...' : 'Calcular Frete pela SuperFrete'}
                        </button>
                        
                        {(!clienteData?.cep && !form.cliente_cep) && (
                          <p className="text-xs text-orange-400 text-center">Informe o CEP do cliente para calcular.</p>
                        )}

                        {erroFrete && (
                          <div className="bg-orange-900/30 border border-orange-500/30 text-orange-200 p-3 rounded-lg text-xs">
                            {erroFrete}
                          </div>
                        )}

                        {opcoesFrete && opcoesFrete.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {form.frete > 0 && !opcoesFrete.some(o => o.price === form.frete) && (
                              <p className="text-[10px] text-amber-400 font-medium mb-1 border border-amber-500/20 bg-amber-900/20 p-2 rounded">
                                ℹ️ O valor de frete salvo ({fmtCurrency(form.frete)}) difere do cálculo. Pode ser de uma cotação anterior ou preenchimento manual.
                              </p>
                            )}
                            <p className="text-xs text-blue-300 font-medium mb-2">Escolha uma opção de frete para atualizar o valor do orçamento automaticamente.</p>
                            <div className="max-h-48 overflow-y-auto pr-1 custom-scrollbar space-y-2">
                              {opcoesFrete.map((opcao: any, idx: number) => (
                                <label key={opcao.name} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${freteSelecionado?.name === opcao.name ? 'border-green-500 bg-green-900/20 shadow-sm' : 'border-slate-700 bg-[#0A0F1C] hover:border-slate-500'}`}>
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="radio" 
                                      name="frete_app" 
                                      checked={freteSelecionado?.name === opcao?.name} 
                                      onChange={() => handleSelecionarFrete(opcao)}
                                      className="w-3 h-3 text-green-600 bg-slate-800 border-slate-600 focus:ring-green-500 cursor-pointer"
                                    />
                                    <div>
                                      <p className="font-bold text-white text-xs leading-tight flex items-center gap-2">
                                        {opcao?.company} - {opcao?.name}
                                        {idx === 0 && <span className="bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Menor Preço</span>}
                                      </p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{opcao?.delivery_time} dias úteis</p>
                                    </div>
                                  </div>
                                  <div className="text-right flex items-center">
                                    <p className="font-bold text-green-400 text-xs">
                                      {fmtCurrency(opcao?.price || 0)}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Desconto (R$)</label>
                    <input name="desconto" type="number" min="0" step="0.01" value={form.desconto} onChange={handleChange}
                      className="form-input" />
                  </div>

                  <div className="pt-5 border-t border-slate-800 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-semibold">Subtotal</span>
                      <span className="text-white font-bold">{fmtCurrency(form.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-semibold">Frete</span>
                      <span className="text-white font-bold">+ {fmtCurrency(form.frete)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-semibold">Desconto</span>
                      <span className="text-emerald-400 font-bold">- {fmtCurrency(form.desconto)}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-800" />
                    <div className="flex justify-between items-center bg-slate-900/50 rounded-xl px-5 py-4 border border-emerald-500/20 shadow-inner">
                      <span className="font-black text-emerald-400 text-lg uppercase tracking-wide">Total Final</span>
                      <span className="text-3xl font-black text-white">{fmtCurrency(form.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company card */}
              <div className="bg-[#0f172a] rounded-2xl p-5 text-slate-200 border border-slate-800 shadow-sm">
                <img src="/logocircular.png" alt="FormaPlay" className="h-12 w-12 object-contain mb-3 rounded-full border-2 border-emerald-500/50 bg-white" />
                <p className="font-black text-base leading-tight tracking-tight text-white">
                  <FormaPlayBrand />
                  <span className="block text-xs font-bold text-slate-400 tracking-wide uppercase mt-0.5">Jogos Educacionais</span>
                </p>
                <div className="mt-2 space-y-1 text-slate-400 text-xs font-medium">
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
          onClienteUpdated={(updatedCliente) => {
            if (form.cliente_id === updatedCliente.id || currentId) {
              if (form.cliente_id === updatedCliente.id) {
                setClienteData(updatedCliente);
              }
              carregarHistorico();
            }
          }}
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
          onOpenTorreControle={() => { setShowDashboard(false); setShowTorreControle(true); }}
        />
      )}

      {/* Torre de Controle Modal */}
      {showTorreControle && (
        <TorreControleModal 
          onClose={() => setShowTorreControle(false)} 
          onOpenDashboard={() => { setShowTorreControle(false); setShowDashboard(true); carregarHistorico(); }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {/* Produtos Modal */}
      {showProdutos && (
        <ProdutosModal onClose={() => setShowProdutos(false)} />
      )}

      {/* Solicitacoes Modal */}
      {showSolicitacoes && (
        <SolicitacoesModal
          solicitacoes={solicitacoes}
          orcamentos={historico}
          onClose={() => setShowSolicitacoes(false)}
          onRefresh={carregarSolicitacoes}
          onConverter={converterSolicitacao}
          loading={loadingSolicitacoes}
          usuarioApp={usuarioApp}
        />
      )}

      {/* Assistente NF-e */}
      {showAssistenteNFe && (
        <AssistenteNFeModal
          orcamento={form}
          onClose={() => setShowAssistenteNFe(false)}
        />
      )}

      {/* Ordem de Produção */}
      <ProducaoModal
        isOpen={showProducao}
        onClose={() => setShowProducao(false)}
        orcamento={form as Orcamento}
        orcamentoId={currentId}
        onSaved={(updated) => {
          setForm(prev => ({ ...prev, ...updated }));
          showToast('success', 'Andamento da produção salvo com sucesso.');
        }}
      />

      {/* Painel de Produção (Fila) */}
      <PainelProducaoModal
        isOpen={showPainelProducao}
        onClose={() => setShowPainelProducao(false)}
        onAbrirOrdem={(orc) => {
          carregarOrcamento(orc);
          setShowPainelProducao(false);
          setShowProducao(true);
        }}
      />
      
      <PainelInteressesModal
        isOpen={showInteresses}
        onClose={() => setShowInteresses(false)}
        onRefresh={carregarInteressesCount}
      />
    </>
  );
}

export default App;
