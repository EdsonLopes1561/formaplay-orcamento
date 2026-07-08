import { calcularVolumesMultiProdutos } from '../config/produtosLogisticos';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Produto, ItemOrcamentoSnapshot } from '../types';
import { PRODUTOS_FALLBACK } from '../config/produtosFallback';
import { criarItemSnapshot, calcularSubtotalItens, calcularQuantidadeTotalItens } from '../utils/orcamentoItens';

type Jogo = string;

const PRECOS: Record<string, number> = {
  'Desafio Logístico': 290,
  'Desafio Logístico Premium': 390,
  'Desafio Kids': 190,
  'Edição do Professor': 390,
};


const PRODUTOS_INFO = [
  {
    nome: 'Desafio Logístico' as Jogo,
    imagem: '/desafio-logistico.png',
    descricao: 'Jogo educacional de tabuleiro que simula decisões logísticas, custos, imprevistos e estratégias de entrega de forma prática e dinâmica.',
    diferenciais: [
      'Aprendizado prático',
      'Aplicação educacional',
      'Estratégia e tomada de decisão',
      'Dinâmica em grupo'
    ]
  },
  {
    nome: 'Desafio Logístico Premium' as Jogo,
    imagem: '/desafio-logistico-premium.png',
    descricao: 'Versão sob encomenda, com layout exclusivo e experiência visual diferenciada.',
    diferenciais: [
      'Layout premium',
      'Apresentação mais sofisticada',
      'Experiência visual diferenciada'
    ]
  },
  {
    nome: 'Desafio Kids' as Jogo,
    imagem: '/desafio-kids.png',
    descricao: 'Versão infantil sob encomenda, com linguagem mais simples, visual lúdico e atividades educativas para crianças.',
    diferenciais: [
      'Linguagem mais simples e visual',
      'Foco em aprendizado lúdico',
      'Ideal para crianças e atividades educativas',
      'Proposta mais acessível'
    ]
  },
  {
    nome: 'Edição do Professor' as Jogo,
    imagem: '/edicao-professor.png',
    descricao: 'Versão sob encomenda preparada para apoiar a aplicação do Desafio Logístico em sala de aula, facilitando a condução da atividade e o reforço dos conceitos trabalhados.',
    diferenciais: [
      'Apoio para aplicação em turma',
      'Organização da dinâmica em sala',
      'Reforço dos conceitos de logística',
      'Material pensado para uso educacional'
    ]
  }
];

const FORMAPLAY_SITE_URL = 'https://www.formaplayjogos.com.br/';

const SUL_SUDESTE = ['PR', 'SC', 'RS', 'RJ', 'MG', 'ES'];

export const SolicitacaoPublica: React.FC = () => {
  const [form, setForm] = useState({
    nome: '',
    documento: '',
    telefone: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    jogo: '' as string,
    observacoes: '',
    embrulho_presente: false,
    forma_pagamento: 'Pix com desconto',
  });
  
  const [quantidadeStr, setQuantidadeStr] = useState<string>('1');
  const [itensCarrinho, setItensCarrinho] = useState<ItemOrcamentoSnapshot[]>([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState<boolean>(true);

  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [opcoesFrete, setOpcoesFrete] = useState<any[] | null>(null);
  const [freteSelecionado, setFreteSelecionado] = useState<any | null>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [erroFrete, setErroFrete] = useState<string | null>(null);

  const numeroInputRef = useRef<HTMLInputElement>(null);
  const enderecoInputRef = useRef<HTMLInputElement>(null);
  const [hasCepFailed, setHasCepFailed] = useState(false);

  // Progressive validation logic
  const isNomeFilled = !!form.nome.trim();
  const isTelefoneFilled = !!form.telefone.trim();
  const isCepComplete = form.cep.replace(/\D/g, '').length === 8;
  const isEnderecoFilled = !!form.endereco.trim();
  const isNumeroFilled = !!form.numero.trim();
  const isBairroFilled = !!form.bairro.trim();
  const isCidadeFilled = !!form.cidade.trim();
  const isEstadoFilled = form.estado.trim().length === 2;

  const isTelefoneEnabled = isNomeFilled;
  const isDocumentoEnabled = isNomeFilled;
  const isEmailEnabled = isNomeFilled;
  const isCepEnabled = isNomeFilled && isTelefoneFilled;

  // Address fields progressive unlocking:
  const isEnderecoEnabled = isCepEnabled && (isCepComplete || isEnderecoFilled || hasCepFailed);
  const isNumeroEnabled = isCepEnabled && (isEnderecoFilled || isNumeroFilled);
  const isComplementoEnabled = isCepEnabled && (isEnderecoFilled || isNumeroFilled);
  const isBairroEnabled = isCepEnabled && (isNumeroFilled || isBairroFilled || isCepComplete || hasCepFailed);
  const isCidadeEnabled = isCepEnabled && (isBairroFilled || isCidadeFilled || isCepComplete || hasCepFailed);
  const isEstadoEnabled = isCepEnabled && (isCidadeFilled || isEstadoFilled || isCepComplete || hasCepFailed);

  const isFormValid =
    isNomeFilled &&
    isTelefoneFilled &&
    isCepComplete &&
    isEnderecoFilled &&
    isNumeroFilled &&
    isBairroFilled &&
    isCidadeFilled &&
    isEstadoFilled &&
    itensCarrinho.length > 0;

  const fmtCurrency = (v: any) => {
    const num = Number(v);
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Carregar produtos da API ou Fallback
  useEffect(() => {
    let active = true;
    const fetchProdutos = async () => {
      try {
        const res = await fetch('/api/produtos');
        if (!res.ok) throw new Error('Falha ao obter produtos');
        const data = await res.json();
        if (active && Array.isArray(data)) {
          const filtrados = data.filter((p: any) => 
            p.ativo && ['disponivel', 'baixo_estoque', 'sob_encomenda'].includes(p.status_comercial)
          );
          setProdutosDisponiveis(filtrados);
          if (filtrados.length > 0) {
            setForm(prev => ({ ...prev, jogo: filtrados[0].nome }));
          }
        }
      } catch (err) {
        console.error('Erro ao buscar produtos, usando fallback:', err);
        if (active) {
          const filtradosFallback = PRODUTOS_FALLBACK.filter((p: any) =>
            p.ativo && ['disponivel', 'baixo_estoque', 'sob_encomenda'].includes(p.status_comercial)
          );
          setProdutosDisponiveis(filtradosFallback);
          if (filtradosFallback.length > 0) {
            setForm(prev => ({ ...prev, jogo: filtradosFallback[0].nome }));
          }
        }
      } finally {
        if (active) setLoadingProdutos(false);
      }
    };
    fetchProdutos();
    return () => { active = false; };
  }, []);

  // Limpar frete se o carrinho estiver vazio
  useEffect(() => {
    if (itensCarrinho.length === 0) {
      setOpcoesFrete(null);
      setFreteSelecionado(null);
    }
  }, [itensCarrinho]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    
    if (name === 'cep') {
      const justNumbers = value.replace(/\D/g, '');
      setForm(prev => ({ ...prev, [name]: justNumbers }));
      if (justNumbers.length < 8) {
        setHasCepFailed(false);
      }
      if (justNumbers.length === 8) {
        fetchCep(justNumbers);
      }
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const fetchCep = async (cepStr: string) => {
    try {
      setLoadingCep(true);
      setHasCepFailed(false);
      const res = await fetch(`https://viacep.com.br/ws/${cepStr}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setTimeout(() => {
          if (data.logradouro) {
            numeroInputRef.current?.focus();
          } else {
            enderecoInputRef.current?.focus();
          }
        }, 50);
      } else {
        setHasCepFailed(true);
        setTimeout(() => {
          enderecoInputRef.current?.focus();
        }, 50);
      }
    } catch (err) {
      console.error('Erro ao buscar CEP', err);
      setHasCepFailed(true);
      setTimeout(() => {
        enderecoInputRef.current?.focus();
      }, 50);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleAdicionarProduto = () => {
    if (!form.jogo) return;
    const prod = produtosDisponiveis.find(p => p.nome === form.jogo);
    if (!prod) return;

    const qty = Math.max(1, parseInt(quantidadeStr) || 1);
    const itemSnapshot = criarItemSnapshot(prod, qty);

    setItensCarrinho(prev => {
      const index = prev.findIndex(item => item.nome === itemSnapshot.nome);
      if (index > -1) {
        const novoCarrinho = [...prev];
        const novaQtd = novoCarrinho[index].quantidade + qty;
        novoCarrinho[index] = {
          ...novoCarrinho[index],
          quantidade: novaQtd,
          subtotal: novaQtd * novoCarrinho[index].valor_unitario
        };
        return novoCarrinho;
      } else {
        return [...prev, itemSnapshot];
      }
    });

    setQuantidadeStr('1');
  };

  const handleRemoverProduto = (nome: string) => {
    setItensCarrinho(prev => prev.filter(item => item.nome !== nome));
  };

  const calcularFrete = async () => {
    if (itensCarrinho.length === 0) return;
    if (!form.cep) return;
    
    setLoadingFrete(true);
    setErroFrete(null);
    setOpcoesFrete(null);
    setFreteSelecionado(null);

    try {
      const volumes = calcularVolumesMultiProdutos(itensCarrinho, produtosDisponiveis);

      if (!volumes) {
        throw new Error('Produtos sem dados logísticos válidos.');
      }

      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cepDestino: form.cep,
          volumes
        })
      });

      if (!res.ok) {
        throw new Error('Falha na API');
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.sort((a, b) => a.price - b.price);
        setOpcoesFrete(data);
        setFreteSelecionado(data[0]);
      } else {
        throw new Error('Sem opções de frete');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Produtos sem dados logísticos válidos.') {
        setErroFrete("Cálculo automático indisponível: alguns produtos no carrinho não possuem dados logísticos configurados. Prossiga com o envio e confirmaremos o frete a combinar.");
      } else {
        setErroFrete("Não foi possível calcular o frete automaticamente no momento. Você ainda pode enviar sua solicitação e a FormaPlay confirmará o frete depois.");
      }
    } finally {
      setLoadingFrete(false);
    }
  };

  const subtotalProdutos = calcularSubtotalItens(itensCarrinho);
  const totalItensQtd = calcularQuantidadeTotalItens(itensCarrinho);

  const obterPrecoProduto = (nome: string): number => {
    const prod = produtosDisponiveis.find(p => p.nome === nome);
    return prod ? prod.preco_base : (PRECOS[nome] || 0);
  };
  
  let freteEstimado = freteSelecionado ? freteSelecionado.price : 0;
  if (!freteSelecionado && form.estado && itensCarrinho.length === 1) {
    const uf = form.estado.toUpperCase();
    if (uf === 'SP') {
      freteEstimado = 20;
    } else if (SUL_SUDESTE.includes(uf)) {
      freteEstimado = 35;
    } else {
      freteEstimado = 50;
    }
  }

  const descontoPix = subtotalProdutos * 0.03;
  const temCalculoFrete = !!freteSelecionado || (itensCarrinho.length === 1 && !!form.estado);

  const totalEstimado = temCalculoFrete 
    ? (subtotalProdutos + freteEstimado) 
    : subtotalProdutos;

  const totalComPix = temCalculoFrete
    ? ((subtotalProdutos - descontoPix) + freteEstimado)
    : (subtotalProdutos - descontoPix);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validacao basica front-end
    if (!form.nome || !form.telefone || !form.cep || !form.endereco || !form.numero || !form.cidade || !form.estado || itensCarrinho.length === 0) {
      setSubmitError("Por favor, preencha todos os campos obrigatórios e adicione pelo menos um produto.");
      return;
    }

    setLoadingSubmit(true);
    setSubmitError(null);

    try {
      const firstItem = itensCarrinho[0];
      const jogoEscolhido = itensCarrinho.length === 1 
        ? firstItem.nome 
        : firstItem.nome + " + outros";

      const quantidadeFinal = itensCarrinho.length === 1
        ? firstItem.quantidade
        : totalItensQtd;

      const requestId = crypto.randomUUID();

      const { error } = await supabase
        .from('solicitacoes_orcamento')
        .insert({
          id: requestId,
          nome_razao: form.nome,
          cpf_cnpj: form.documento || null,
          telefone: form.telefone,
          email: form.email || null,
          cep: form.cep,
          endereco: form.endereco,
          numero: form.numero,
          complemento: form.complemento || null,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          jogo_escolhido: jogoEscolhido,
          quantidade: Number(quantidadeFinal) || 1,
          valor_estimado: Number(subtotalProdutos) || 0,
          frete_estimado: Number(freteEstimado) || 0,
          desconto_pix: Number(descontoPix) || 0,
          total_estimado: Number(totalEstimado) || 0,
          observacoes_cliente: (() => {
            let obsFrete = '';
            if (freteSelecionado) {
              obsFrete = ` | FRETE: ${freteSelecionado.company || ''} ${freteSelecionado.name || ''} (${freteSelecionado.delivery_time || 0}d) ${fmtCurrency(freteSelecionado.price)}`;
            } else if (!temCalculoFrete) {
              obsFrete = ` | FRETE A COMBINAR.`;
            }
            let obsFinal = ((form.observacoes || '') + obsFrete).trim();
            if (obsFinal.length > 250) {
              obsFinal = obsFinal.substring(0, 247) + '...';
            }
            return obsFinal || null;
          })(),
          embrulho_presente: form.embrulho_presente,
          forma_pagamento: form.forma_pagamento,
          itens: itensCarrinho
        });

      if (error) {
        console.error("Erro Real do Supabase ao Inserir Solicitação:");
        console.error(" - Message:", error.message);
        console.error(" - Details:", error.details);
        console.error(" - Hint:", error.hint);
        console.error(" - Code:", error.code);
        throw new Error(error.message);
      }

      setIsSuccess(true);

      // Dispara notificação push em segundo plano sem bloquear a interface de sucesso do usuário
      fetch('/api/push/notify-new-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: requestId })
      }).catch(pushErr => {
        console.warn('[Push Notification] Falha ao disparar notificação automática:', pushErr);
      });
    } catch (err: any) {
      console.error('[Solicitação Pública] Erro ao salvar solicitação:', err);
      const errorMessage = err.message || err.toString() || "Erro desconhecido";
      setSubmitError(`Falha ao enviar. Detalhe técnico para o suporte: ${errorMessage}`);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] py-10 px-4 font-sans flex items-center justify-center text-slate-200 relative overflow-hidden">
        {/* CSS Animations */}
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(24px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.7);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes drawCheck {
            to {
              stroke-dashoffset: 0;
            }
          }
          @keyframes drive {
            0% {
              transform: translateX(-120%);
            }
            70% {
              transform: translateX(10px);
            }
            85% {
              transform: translateX(-5px);
            }
            100% {
              transform: translateX(0);
            }
          }
          @keyframes wheelRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(1080deg); }
          }
          @keyframes pulseGlow {
            0%, 100% {
              opacity: 0.1;
              transform: scale(1);
            }
            50% {
              opacity: 0.2;
              transform: scale(1.08);
            }
          }
          .animate-card-enter {
            animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-success-check {
            animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .animate-truck-drive {
            animation: drive 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .animate-wheel {
            animation: wheelRotate 1.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            transform-origin: center;
          }
          .animate-pulse-glow {
            animation: pulseGlow 4s ease-in-out infinite;
          }
        `}</style>

        {/* Pulsing Background Glow */}
        <div className="absolute w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] -top-40 -left-40 pointer-events-none animate-pulse-glow" />
        <div className="absolute w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] -bottom-40 -right-40 pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/80 text-center relative overflow-hidden animate-card-enter">
          {/* Card Border Glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-blue-500" />
          
          {/* Glow Behind Icons */}
          <div className="absolute left-1/2 top-20 -translate-x-1/2 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

          {/* 1. Success Check Icon */}
          <div className="relative w-20 h-20 mx-auto mb-6 animate-success-check">
            {/* Pulsing outer ring */}
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            
            {/* Solid check circle */}
            <div className="relative w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-green-400/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-[drawCheck_0.5s_ease-out_0.5s_both]" style={{ strokeDasharray: 20, strokeDashoffset: 20 }} />
              </svg>
            </div>
          </div>

          {/* 2. Logistics Truck Motion */}
          <div className="relative h-16 w-36 mx-auto mb-6 overflow-hidden">
            {/* Road Line */}
            <div className="absolute bottom-1 left-0 right-0 h-[2px] bg-slate-700/50 rounded" />
            
            {/* Animated Truck */}
            <div className="absolute bottom-1 left-1/2 -ml-12 w-24 h-12 animate-truck-drive">
              <svg viewBox="0 0 96 48" className="w-full h-full text-green-400" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Truck shadow */}
                <path d="M6 32h70l14-14V6H52v4H20v22H6z" fill="currentColor" fillOpacity="0.03" />
                
                {/* Cargo Container */}
                <rect x="6" y="8" width="52" height="24" rx="2" fill="#1E293B" stroke="currentColor" strokeWidth="2" />
                <line x1="20" y1="8" x2="20" y2="32" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="40" y1="8" x2="40" y2="32" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                
                {/* Cabin */}
                <path d="M58 14h18l12 12v6H58V14z" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
                
                {/* Window */}
                <path d="M68 18h6l6 6h-12v-6z" fill="#38BDF8" fillOpacity="0.25" stroke="#38BDF8" strokeWidth="1.5" />
                
                {/* Light */}
                <circle cx="84" cy="28" r="1.5" fill="#FDE047" />
                
                {/* Wheel 1 */}
                <g className="animate-wheel" style={{ transformOrigin: '20px 36px' }}>
                  <circle cx="20" cy="36" r="6" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
                  <circle cx="20" cy="36" r="2" fill="#64748B" />
                  <line x1="20" y1="30" x2="20" y2="42" stroke="currentColor" strokeWidth="1" />
                  <line x1="14" y1="36" x2="26" y2="36" stroke="currentColor" strokeWidth="1" />
                </g>
                
                {/* Wheel 2 */}
                <g className="animate-wheel" style={{ transformOrigin: '70px 36px' }}>
                  <circle cx="70" cy="36" r="6" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
                  <circle cx="70" cy="36" r="2" fill="#64748B" />
                  <line x1="70" y1="30" x2="70" y2="42" stroke="currentColor" strokeWidth="1" />
                  <line x1="64" y1="36" x2="76" y2="36" stroke="currentColor" strokeWidth="1" />
                </g>
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-black text-white mb-3">Solicitação enviada com sucesso!</h2>
          <p className="text-slate-300 mb-8 font-medium leading-relaxed">
            A FormaPlay recebeu seus dados e entrará em contato em breve pelo WhatsApp informado.
          </p>

          <a href={FORMAPLAY_SITE_URL} className="inline-block px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_20px_rgba(22,163,74,0.3)] hover:shadow-[0_4px_25px_rgba(22,163,74,0.5)] w-full text-base">
            Voltar para o site da FormaPlay
          </a>
        </div>
      </div>
    );
  }

  const volumesDisponiveis = calcularVolumesMultiProdutos(itensCarrinho, produtosDisponiveis);
  const isCalculoFreteDisponivel = volumesDisponiveis !== null && volumesDisponiveis.length > 0;

  return (
    <div className="min-h-screen bg-[#0A0F1C] py-10 px-4 font-sans text-slate-200">
      <div className="max-w-3xl mx-auto bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center text-white border-b-4 border-green-500 relative">
          <div className="flex justify-center mb-4 relative z-10">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
               <img src="/logocircular.png" alt="FormaPlay" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md relative z-10">Solicitação de Orçamento</h1>
          <p className="text-slate-300 mt-2 font-medium relative z-10">Preencha os dados abaixo e receba sua cotação estimada na hora.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          
          <div className="space-y-8">
            
            {/* Secao 1: Dados do Cliente */}
            <div>
              <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">1</span>
                Seus Dados
              </h2>
              {(() => {
                const inputClass = "w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all text-white placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-900/30 disabled:border-slate-700 disabled:cursor-not-allowed";
                const inputBaseClass = "w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all text-white disabled:opacity-50 disabled:bg-slate-900/30 disabled:border-slate-700 disabled:cursor-not-allowed";
                const stateInputClass = "w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none uppercase transition-all text-white placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-900/30 disabled:border-slate-700 disabled:cursor-not-allowed";

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Nome completo ou Razão Social *</label>
                      <input required name="nome" value={form.nome} onChange={handleChange} className={inputClass} placeholder="Como deseja ser chamado?" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1">CPF / CNPJ</label>
                      <input name="documento" value={form.documento} onChange={handleChange} disabled={!isDocumentoEnabled} className={inputClass} placeholder="Opcional" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Telefone (WhatsApp) *</label>
                      <input required name="telefone" value={form.telefone} onChange={handleChange} disabled={!isTelefoneEnabled} className={inputClass} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">E-mail</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} disabled={!isEmailEnabled} className={inputClass} placeholder="seu@email.com" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Secao 2: Endereço */}
            <div>
              <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">2</span>
                Endereço de Entrega
              </h2>
              {(() => {
                const inputClass = "w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all text-white placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-900/30 disabled:border-slate-700 disabled:cursor-not-allowed";
                const inputBaseClass = "w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all text-white disabled:opacity-50 disabled:bg-slate-900/30 disabled:border-slate-700 disabled:cursor-not-allowed";
                const stateInputClass = "w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none uppercase transition-all text-white placeholder-slate-500 disabled:opacity-50 disabled:bg-slate-900/30 disabled:border-slate-700 disabled:cursor-not-allowed";

                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">CEP *</label>
                      <div className="relative">
                        <input required name="cep" value={form.cep} onChange={handleChange} maxLength={8} disabled={!isCepEnabled} className={inputClass} placeholder="Apenas números" />
                        {loadingCep && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>}
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Endereço (Rua, Av...) *</label>
                      <input ref={enderecoInputRef} required name="endereco" value={form.endereco} onChange={handleChange} disabled={!isEnderecoEnabled} className={inputBaseClass} />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Número *</label>
                      <input ref={numeroInputRef} required name="numero" value={form.numero} onChange={handleChange} disabled={!isNumeroEnabled} className={inputBaseClass} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Complemento</label>
                      <input name="complemento" value={form.complemento} onChange={handleChange} disabled={!isComplementoEnabled} className={inputClass} placeholder="Apto, Bloco, Casa 2..." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Bairro *</label>
                      <input required name="bairro" value={form.bairro} onChange={handleChange} disabled={!isBairroEnabled} className="w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-500" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Cidade *</label>
                      <input required name="cidade" value={form.cidade} onChange={handleChange} disabled={!isCidadeEnabled} className="w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-500" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-slate-300 mb-1">Estado (UF) *</label>
                      <input required name="estado" value={form.estado} onChange={handleChange} maxLength={2} disabled={!isEstadoEnabled} className="uppercase w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-slate-500" placeholder="SP" />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Secao 3: Pedido */}
            <div>
              <h2 className="text-xl font-bold text-white border-b border-slate-700 pb-2 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">3</span>
                Seu Pedido
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Escolher Produto *</label>
                  <select name="jogo" value={form.jogo} onChange={handleChange} className="w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none text-white transition-all cursor-pointer">
                    {loadingProdutos ? (
                      <option value="" disabled>Carregando produtos...</option>
                    ) : (
                      <>
                        <option value="" disabled>Selecione um jogo...</option>
                        {produtosDisponiveis.map(p => (
                          <option key={p.id} value={p.nome}>{p.nome} ({fmtCurrency(p.preco_base)})</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Quantidade *</label>
                  <div className="flex items-center">
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = parseInt(quantidadeStr) || 1;
                        if (val > 1) setQuantidadeStr((val - 1).toString());
                      }}
                      className="w-10 h-[42px] bg-slate-700 hover:bg-slate-600 text-white rounded-l-lg border border-slate-600 border-r-0 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      name="quantidade" 
                      value={quantidadeStr} 
                      onChange={(e) => setQuantidadeStr(e.target.value)} 
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) {
                          setQuantidadeStr('1');
                        } else {
                          setQuantidadeStr(val.toString());
                        }
                      }}
                      className="w-full h-[42px] px-2 text-center bg-[#0A0F1C] border border-slate-600 focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all text-white font-bold" 
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const val = parseInt(quantidadeStr) || 1;
                        setQuantidadeStr((val + 1).toString());
                      }}
                      className="w-10 h-[42px] bg-slate-700 hover:bg-slate-600 text-white rounded-r-lg border border-slate-600 border-l-0 flex items-center justify-center font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={handleAdicionarProduto}
                    disabled={!form.jogo}
                    className="w-full h-[42px] bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-md flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>➕ Adicionar</span>
                  </button>
                </div>

                {/* Carrinho / Itens adicionados */}
                <div className="md:col-span-4">
                  {itensCarrinho.length === 0 ? (
                    <div className="bg-[#0A0F1C] border border-dashed border-slate-700 p-6 rounded-xl text-center text-slate-400 text-sm">
                      🛒 Nenhum produto adicionado ao seu orçamento ainda. Selecione um jogo acima e clique em "Adicionar".
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 border border-slate-700 rounded-xl p-4 space-y-3">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Produtos no Orçamento</h4>
                      <div className="divide-y divide-slate-800">
                        {itensCarrinho.map((item) => (
                          <div key={item.sku} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 gap-2">
                            <div className="flex items-center gap-3">
                              {item.imagem_url ? (
                                <img src={item.imagem_url} alt={item.nome} className="w-10 h-10 object-contain rounded bg-[#0A0F1C] p-1 border border-slate-700" />
                              ) : (
                                <div className="w-10 h-10 flex items-center justify-center rounded bg-[#0A0F1C] text-lg border border-slate-700">📦</div>
                              )}
                              <div>
                                <p className="font-bold text-white text-sm">{item.nome}</p>
                                <p className="text-xs text-slate-400">Unitário: {fmtCurrency(item.valor_unitario)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                              <span className="text-xs bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded-full">
                                Qtd: {item.quantidade}
                              </span>
                              <span className="font-bold text-slate-200 text-sm whitespace-nowrap">{fmtCurrency(item.subtotal)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoverProduto(item.nome)}
                                className="text-red-400 hover:text-red-300 p-1 font-bold text-xs cursor-pointer transition-colors"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {form.jogo && (
                  <div className="md:col-span-4 mt-2 animate-fade-in-up">
                    {PRODUTOS_INFO.filter(p => p.nome === form.jogo).map(produto => (
                      <div key={produto.nome} className="bg-slate-800 border-2 border-slate-600 rounded-xl overflow-hidden shadow-md">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-1/3 bg-[#0A0F1C] p-4 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-700">
                            <img src={produto.imagem} alt={produto.nome} className="max-w-full h-auto rounded-lg shadow-sm" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                          </div>
                          <div className="md:w-2/3 p-6">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-xl font-black text-white">{produto.nome}</h3>
                              <span className="bg-green-500/20 text-green-400 font-bold px-3 py-1 rounded-full text-sm whitespace-nowrap ml-2">
                                {fmtCurrency(obterPrecoProduto(produto.nome))}
                              </span>
                            </div>
                            <p className="text-slate-300 mb-4">{produto.descricao}</p>
                            <div className="mb-4">
                              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Diferenciais:</h4>
                              <ul className="space-y-1">
                                {produto.diferenciais.map((dif, idx) => (
                                  <li key={idx} className="flex items-start text-sm text-slate-300">
                                    <span className="text-green-500 mr-2">✓</span>
                                    {dif}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-[#0A0F1C] border border-slate-700 p-3 rounded-lg text-xs text-slate-300 flex gap-2">
                              <span className="text-green-500 text-base leading-none">ℹ️</span>
                              <p>O valor estimado será confirmado pela FormaPlay.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {PRODUTOS_INFO.filter(p => p.nome !== form.jogo).length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Outras opções FormaPlay</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {PRODUTOS_INFO.filter(p => p.nome !== form.jogo).map(outraOpcao => (
                            <button
                              type="button"
                              key={outraOpcao.nome}
                              onClick={() => setForm(prev => ({ ...prev, jogo: outraOpcao.nome }))}
                              className="text-left bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-green-500 hover:shadow-md transition-all group cursor-pointer flex flex-col h-full"
                            >
                              <div className="h-24 mb-2 flex items-center justify-center overflow-hidden rounded bg-[#0A0F1C] relative transition-colors">
                                <img src={outraOpcao.imagem} alt={outraOpcao.nome} className="max-h-full object-contain transition-transform group-hover:scale-110" />
                              </div>
                              <h5 className="font-bold text-white text-sm mb-1 leading-tight">{outraOpcao.nome}</h5>
                              <span className="text-green-400 font-semibold text-sm mt-auto">{fmtCurrency(obterPrecoProduto(outraOpcao.nome))}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="md:col-span-4 bg-[#0A0F1C] p-4 rounded-lg border border-slate-700 flex items-start gap-3 mt-2 mb-2">
                  <div className="flex items-center h-5 mt-0.5">
                    <input id="embrulho_presente" name="embrulho_presente" type="checkbox" checked={form.embrulho_presente} onChange={handleChange} className="w-5 h-5 text-green-600 bg-[#0A0F1C] border-slate-600 rounded focus:ring-green-500 focus:ring-offset-slate-800 transition-all cursor-pointer" />
                  </div>
                  <div className="text-sm">
                    <label htmlFor="embrulho_presente" className="font-bold text-white cursor-pointer text-base">Quero receber embrulhado para presente — sem custo adicional</label>
                    <p className="text-slate-400 mt-0.5 font-medium">A FormaPlay prepara com carinho, sem custo adicional.</p>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Observações adicionais (Opcional)</label>
                  <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none resize-none transition-all text-white placeholder-slate-500" placeholder="Alguma dúvida ou detalhe específico?"></textarea>
                </div>
                <div className="md:col-span-4 border-t border-slate-700 pt-4 mt-2">
                  <label className="block text-sm font-semibold text-slate-300 mb-1">Forma de pagamento pretendida *</label>
                  <select required name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange} className="w-full px-4 py-2 bg-[#0A0F1C] border border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none text-white transition-all shadow-sm">
                    <option value="Pix com desconto">Pix com desconto (3% OFF)</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Boleto / transferência">Boleto / transferência</option>
                    <option value="A combinar">A combinar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Secao Frete */}
            {itensCarrinho.length > 0 && (
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 mt-6">
                {(!form?.cep || form?.cep?.length < 8) ? (
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                    <div>
                      <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        🚚 Opções de Frete
                      </h3>
                      <p className="text-sm text-slate-400">Informe o CEP de entrega para calcular o frete.</p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-slate-300 rounded-lg cursor-not-allowed font-bold text-sm whitespace-nowrap"
                    >
                      Calcular Frete
                    </button>
                  </div>
                ) : isCalculoFreteDisponivel ? (
                  <>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                      <div>
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                          🚚 Opções de Frete
                        </h3>
                        <p className="text-sm text-slate-400">Calcule o frete para {form.cep} ({totalItensQtd} item/itens no total)</p>
                      </div>
                      <button
                        type="button"
                        onClick={calcularFrete}
                        disabled={loadingFrete}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 active:scale-95 transition-all font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
                      >
                        {loadingFrete ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                        {loadingFrete ? 'Calculando...' : 'Calcular Frete'}
                      </button>
                    </div>

                    {erroFrete && (
                      <div className="bg-orange-900/30 border border-orange-500/30 text-orange-200 p-4 rounded-lg text-sm mb-4">
                        {erroFrete}
                      </div>
                    )}

                    {opcoesFrete && opcoesFrete.length > 0 && (
                      <div className="space-y-3">
                        {opcoesFrete.map((opcao: any) => (
                          <label key={opcao.name} className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${freteSelecionado?.name === opcao.name ? 'border-green-500 bg-green-900/20 shadow-md ring-1 ring-green-500' : 'border-slate-700 bg-[#0A0F1C] hover:border-slate-500'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name="frete" 
                                checked={freteSelecionado?.name === opcao?.name} 
                                onChange={() => setFreteSelecionado(opcao)}
                                className="w-4 h-4 text-green-600 bg-slate-800 border-slate-600 focus:ring-green-500 focus:ring-offset-slate-900 cursor-pointer"
                              />
                              <div>
                                <p className="font-bold text-white leading-tight">{opcao?.company || 'Transportadora'} - {opcao?.name || 'Serviço'}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{opcao?.delivery_time || 0} dias úteis • {opcao?.volumes_validos || 1} volume(s)</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-400">{fmtCurrency(opcao?.price || 0)}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                      🚚 Opções de Frete
                    </h3>
                    <div className="bg-blue-900/30 border border-blue-500/30 text-blue-200 p-4 rounded-lg text-sm">
                      ℹ️ <strong>Produto sem dimensões/peso cadastrados para cálculo automático.</strong> Prossiga com o envio e confirmaremos o valor exato no atendimento.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resumo */}
            {itensCarrinho.length > 0 && (
              <div className="bg-[#0A0F1C] p-6 rounded-xl border border-slate-700 shadow-sm mt-8">
                <h3 className="font-bold text-white mb-4 uppercase tracking-wide text-sm">Resumo Estimado</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Produtos ({totalItensQtd} item/itens)</span>
                    <span className="font-semibold text-white">{fmtCurrency(subtotalProdutos)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Desconto PIX (3%)</span>
                    <span className="font-semibold text-green-400">-{fmtCurrency(descontoPix)}</span>
                  </div>

                  <div className="flex justify-between pb-3 border-b border-slate-700">
                    <div className="flex items-center gap-1">
                      <span>Frete Estimado</span>
                      {form.estado && <span className="bg-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded-full font-bold">{form.estado.toUpperCase()}</span>}
                    </div>
                    <span className="font-semibold text-white">
                      {freteSelecionado 
                        ? fmtCurrency(freteEstimado) 
                        : (temCalculoFrete ? 'A calcular' : 'A combinar')
                      }
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium ${form.forma_pagamento !== 'Pix com desconto' ? 'text-white font-bold text-lg' : 'text-slate-500'}`}>Total Estimado (Prazo)</span>
                      <span className={`${form.forma_pagamento !== 'Pix com desconto' ? 'text-2xl font-black text-white' : 'text-lg font-bold text-slate-300'}`}>
                        {temCalculoFrete 
                          ? fmtCurrency(totalEstimado) 
                          : 'A combinar'
                        }
                      </span>
                    </div>
                    <div className={`flex justify-between items-center ${form.forma_pagamento !== 'Pix com desconto' ? 'opacity-50' : ''}`}>
                      <span className="text-green-500 font-bold">Total com Desconto PIX</span>
                      <span className={`${form.forma_pagamento === 'Pix com desconto' ? 'text-2xl font-black' : 'text-lg font-bold'} text-green-400`}>
                        {temCalculoFrete 
                          ? fmtCurrency(totalComPix) 
                          : `${fmtCurrency(subtotalProdutos - descontoPix)} + frete`
                        }
                      </span>
                    </div>
                    {form.forma_pagamento !== 'Pix com desconto' && (
                      <p className="text-xs text-orange-400 font-medium mt-2 text-right">Desconto de 3% exclusivo para pagamento via Pix.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 bg-slate-800 border border-slate-700 p-3 rounded-lg text-xs text-slate-300 font-medium flex gap-2">
                  <span className="text-green-500 text-lg leading-none">ℹ️</span>
                  <p><strong>Frete estimado.</strong> O valor final será confirmado pela FormaPlay após a análise completa do seu endereço e cálculo de rotas.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-xl flex gap-3 mt-4 animate-fade-in-up">
                <span className="text-red-400 font-bold">!</span>
                <p>{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loadingSubmit || !isFormValid}
                className={`w-full font-bold text-lg py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  loadingSubmit || !isFormValid
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-500 hover:shadow-green-500/20 hover:-translate-y-1'
                }`}
              >
                {loadingSubmit ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : itensCarrinho.length === 0 ? (
                  "Adicione produtos ao seu pedido"
                ) : !isFormValid ? (
                  "Preencha todos os campos obrigatórios"
                ) : (
                  "Enviar solicitação para a FormaPlay"
                )}
              </button>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="bg-[#0A0F1C] py-4 text-center border-t border-slate-700">
          <a href={FORMAPLAY_SITE_URL} className="text-green-500 hover:text-green-400 text-sm font-semibold transition-colors">
            &larr; Voltar para o site da FormaPlay
          </a>
        </div>
      </div>
    </div>
  );
};
