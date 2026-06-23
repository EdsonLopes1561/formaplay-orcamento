import React, { useState } from 'react';
import { supabase } from '../supabase';

type Jogo = 'Desafio Logístico' | 'Desafio Logístico Premium' | 'Desafio Kids' | 'Edição do Professor';

const PRECOS: Record<Jogo, number> = {
  'Desafio Logístico': 290,
  'Desafio Logístico Premium': 390,
  'Desafio Kids': 190,
  'Edição do Professor': 390,
};

const PRODUTOS_INFO = [
  {
    nome: 'Desafio Logístico' as Jogo,
    imagem: '/desafio-logistico.png',
    descricao: 'Jogo educacional de logística para desenvolver planejamento, tomada de decisão, custos, rotas e estratégia.',
    diferenciais: [
      'Simula situações reais da logística',
      'Trabalha custos, imprevistos e decisões',
      'Ideal para cursos técnicos, escolas e treinamentos',
      'Estimula participação e aprendizado prático'
    ]
  },
  {
    nome: 'Desafio Logístico Premium' as Jogo,
    imagem: '/desafio-logistico-premium.png',
    descricao: 'Versão especial do Desafio Logístico com apresentação diferenciada e acabamento superior.',
    diferenciais: [
      'Apresentação mais premium',
      'Ideal para presentes, eventos e instituições',
      'Maior impacto visual na entrega',
      'Experiência mais marcante para o cliente'
    ]
  },
  {
    nome: 'Desafio Kids' as Jogo,
    imagem: '/desafio-kids.png',
    descricao: 'Versão infantil em desenvolvimento, com proposta lúdica e educativa para crianças.',
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
    descricao: 'Versão voltada para o educador com materiais de apoio e facilitação de dinâmicas.',
    diferenciais: [
      'Material de apoio ao professor',
      'Facilita a aplicação de dinâmicas',
      'Guia prático de turmas',
      'Versão ampliada para sala de aula'
    ]
  }
];

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
    jogo: '' as Jogo | '',
    quantidade: 1,
    observacoes: '',
    embrulho_presente: false,
    forma_pagamento: 'Pix com desconto',
  });

  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    
    if (name === 'cep') {
      const justNumbers = value.replace(/\D/g, '');
      setForm(prev => ({ ...prev, [name]: justNumbers }));
      if (justNumbers.length === 8) {
        fetchCep(justNumbers);
      }
      return;
    }

    if (name === 'quantidade') {
      setForm(prev => ({ ...prev, [name]: Math.max(1, parseInt(value) || 1) }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const fetchCep = async (cepStr: string) => {
    try {
      setLoadingCep(true);
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
      }
    } catch (err) {
      console.error('Erro ao buscar CEP', err);
    } finally {
      setLoadingCep(false);
    }
  };

  const valorProdutos = form.jogo ? PRECOS[form.jogo] * form.quantidade : 0;
  
  let freteEstimado = 0;
  if (form.estado) {
    const uf = form.estado.toUpperCase();
    if (uf === 'SP') {
      freteEstimado = 20;
    } else if (SUL_SUDESTE.includes(uf)) {
      freteEstimado = 35;
    } else {
      freteEstimado = 50;
    }
  }

  const descontoPix = valorProdutos * 0.03;
  const totalEstimado = valorProdutos + freteEstimado;
  const totalComPix = (valorProdutos - descontoPix) + freteEstimado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validacao basica front-end
    if (!form.nome || !form.telefone || !form.cep || !form.endereco || !form.numero || !form.cidade || !form.estado || !form.jogo || form.quantidade < 1) {
      setSubmitError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoadingSubmit(true);
    setSubmitError(null);

    try {
      const { error } = await supabase
        .from('solicitacoes_orcamento')
        .insert({
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
          jogo_escolhido: form.jogo,
          quantidade: form.quantidade,
          valor_estimado: form.jogo ? PRECOS[form.jogo] * form.quantidade : 0,
          frete_estimado: freteEstimado,
          desconto_pix: form.jogo ? (PRECOS[form.jogo] * form.quantidade) * 0.03 : 0,
          total_estimado: totalEstimado,
          observacoes_cliente: form.observacoes || null,
          embrulho_presente: form.embrulho_presente,
          forma_pagamento: form.forma_pagamento
        });

      if (error) {
        console.error("Erro Supabase:", error);
        throw new Error(error.message);
      }

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setSubmitError("Não foi possível enviar sua solicitação agora. Verifique os dados e tente novamente.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-xl text-center border-t-8 border-green-500 animate-fade-in-up">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Solicitação enviada com sucesso!</h2>
          <p className="text-gray-600 mb-8 font-medium">A FormaPlay recebeu seus dados e entrará em contato em breve pelo WhatsApp informado.</p>
          <a href="http://localhost:5000" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md w-full">
            Voltar para o site da FormaPlay
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 p-8 text-center text-white border-b-4 border-green-500">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg p-2">
               <img src="/logocircular.png" alt="FormaPlay" className="w-full h-full object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight drop-shadow-md">Solicitação de Orçamento</h1>
          <p className="text-blue-200 mt-2 font-medium">Preencha os dados abaixo e receba sua cotação estimada na hora.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8">
          
          <div className="space-y-8">
            
            {/* Secao 1: Dados do Cliente */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">1</span>
                Seus Dados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome completo ou Razão Social *</label>
                  <input required name="nome" value={form.nome} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Como deseja ser chamado?" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CPF / CNPJ</label>
                  <input name="documento" value={form.documento} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Opcional" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone (WhatsApp) *</label>
                  <input required name="telefone" value={form.telefone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="(00) 00000-0000" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">E-mail</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="seu@email.com" />
                </div>
              </div>
            </div>

            {/* Secao 2: Endereço */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">2</span>
                Endereço de Entrega
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">CEP *</label>
                  <div className="relative">
                    <input required name="cep" value={form.cep} onChange={handleChange} maxLength={8} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Apenas números" />
                    {loadingCep && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço (Rua, Av...) *</label>
                  <input required name="endereco" value={form.endereco} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Número *</label>
                  <input required name="numero" value={form.numero} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Complemento</label>
                  <input name="complemento" value={form.complemento} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Apto, Bloco, Casa 2..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bairro *</label>
                  <input required name="bairro" value={form.bairro} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Cidade *</label>
                  <input required name="cidade" value={form.cidade} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado (UF) *</label>
                  <input required name="estado" value={form.estado} onChange={handleChange} maxLength={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase transition-all" placeholder="SP" />
                </div>
              </div>
            </div>

            {/* Secao 3: Pedido */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">3</span>
                Seu Pedido
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jogo escolhido *</label>
                  <select required name="jogo" value={form.jogo} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all">
                    <option value="" disabled>Selecione uma opção...</option>
                    <option value="Desafio Logístico">Desafio Logístico (R$ 290,00)</option>
                    <option value="Desafio Logístico Premium">Desafio Logístico Premium (R$ 390,00)</option>
                    <option value="Desafio Kids">Desafio Kids (R$ 190,00)</option>
                    <option value="Edição do Professor">Edição do Professor (R$ 390,00)</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Quantidade *</label>
                  <input type="number" required min="1" name="quantidade" value={form.quantidade} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>

                {form.jogo && (
                  <div className="md:col-span-4 mt-4 animate-fade-in-up">
                    {PRODUTOS_INFO.filter(p => p.nome === form.jogo).map(produto => (
                      <div key={produto.nome} className="bg-white border-2 border-blue-100 rounded-xl overflow-hidden shadow-md">
                        <div className="flex flex-col md:flex-row">
                          <div className="md:w-1/3 bg-slate-50 p-4 flex items-center justify-center border-b md:border-b-0 md:border-r border-blue-100">
                            <img src={produto.imagem} alt={produto.nome} className="max-w-full h-auto rounded-lg shadow-sm" style={{ maxHeight: '200px', objectFit: 'contain' }} />
                          </div>
                          <div className="md:w-2/3 p-6">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-xl font-black text-gray-800">{produto.nome}</h3>
                              <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm whitespace-nowrap ml-2">
                                {fmtCurrency(PRECOS[produto.nome])}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-4">{produto.descricao}</p>
                            <div className="mb-4">
                              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Diferenciais:</h4>
                              <ul className="space-y-1">
                                {produto.diferenciais.map((dif, idx) => (
                                  <li key={idx} className="flex items-start text-sm text-gray-600">
                                    <span className="text-green-500 mr-2">✓</span>
                                    {dif}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 flex gap-2">
                              <span className="text-blue-500 text-base leading-none">ℹ️</span>
                              <p>O valor estimado será confirmado pela FormaPlay.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {PRODUTOS_INFO.filter(p => p.nome !== form.jogo).length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Outras opções FormaPlay</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {PRODUTOS_INFO.filter(p => p.nome !== form.jogo).map(outraOpcao => (
                            <button
                              type="button"
                              key={outraOpcao.nome}
                              onClick={() => setForm(prev => ({ ...prev, jogo: outraOpcao.nome }))}
                              className="text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer flex flex-col h-full"
                            >
                              <div className="h-24 mb-2 flex items-center justify-center overflow-hidden rounded bg-slate-50 relative group-hover:bg-blue-50 transition-colors">
                                <img src={outraOpcao.imagem} alt={outraOpcao.nome} className="max-h-full object-contain transition-transform group-hover:scale-110" />
                              </div>
                              <h5 className="font-bold text-gray-800 text-sm mb-1 leading-tight">{outraOpcao.nome}</h5>
                              <span className="text-blue-600 font-semibold text-sm mt-auto">{fmtCurrency(PRECOS[outraOpcao.nome])}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="md:col-span-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex items-start gap-3 mt-2 mb-2">
                  <div className="flex items-center h-5 mt-0.5">
                    <input id="embrulho_presente" name="embrulho_presente" type="checkbox" checked={form.embrulho_presente} onChange={handleChange} className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-all cursor-pointer" />
                  </div>
                  <div className="text-sm">
                    <label htmlFor="embrulho_presente" className="font-bold text-gray-800 cursor-pointer text-base">Quero receber embrulhado para presente — sem custo adicional</label>
                    <p className="text-gray-500 mt-0.5 font-medium">A FormaPlay prepara com carinho, sem custo adicional.</p>
                  </div>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Observações adicionais (Opcional)</label>
                  <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all" placeholder="Alguma dúvida ou detalhe específico?"></textarea>
                </div>
                <div className="md:col-span-4 border-t border-gray-100 pt-4 mt-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Forma de pagamento pretendida *</label>
                  <select required name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all shadow-sm">
                    <option value="Pix com desconto">Pix com desconto (3% OFF)</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Boleto / transferência">Boleto / transferência</option>
                    <option value="A combinar">A combinar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Resumo */}
            {form.jogo && (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
                <h3 className="font-bold text-gray-800 mb-4 uppercase tracking-wide text-sm">Resumo Estimado</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Produtos ({form.quantidade}x {form.jogo})</span>
                    <span className="font-semibold text-gray-900">{fmtCurrency(valorProdutos)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Desconto PIX (3%)</span>
                    <span className="font-semibold text-green-600">-{fmtCurrency(descontoPix)}</span>
                  </div>

                  <div className="flex justify-between pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-1">
                      <span>Frete Estimado</span>
                      {form.estado && <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">{form.estado.toUpperCase()}</span>}
                    </div>
                    <span className="font-semibold text-gray-900">{freteEstimado > 0 ? fmtCurrency(freteEstimado) : 'A calcular'}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium ${form.forma_pagamento !== 'Pix com desconto' ? 'text-gray-800 font-bold text-lg' : 'text-gray-500'}`}>Total Estimado (Prazo)</span>
                      <span className={`${form.forma_pagamento !== 'Pix com desconto' ? 'text-2xl font-black text-blue-800' : 'text-lg font-bold text-gray-800'}`}>{fmtCurrency(totalEstimado)}</span>
                    </div>
                    <div className={`flex justify-between items-center ${form.forma_pagamento !== 'Pix com desconto' ? 'opacity-50' : ''}`}>
                      <span className="text-green-700 font-bold">Total com Desconto PIX</span>
                      <span className={`${form.forma_pagamento === 'Pix com desconto' ? 'text-2xl font-black' : 'text-lg font-bold'} text-green-600`}>{fmtCurrency(totalComPix)}</span>
                    </div>
                    {form.forma_pagamento !== 'Pix com desconto' && (
                      <p className="text-xs text-orange-600 font-medium mt-2 text-right">Desconto de 3% exclusivo para pagamento via Pix.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 font-medium flex gap-2">
                  <span className="text-blue-500 text-lg leading-none">ℹ️</span>
                  <p><strong>Frete estimado.</strong> O valor final será confirmado pela FormaPlay após a análise completa do seu endereço e cálculo de rotas.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3 mt-4 animate-fade-in-up">
                <span className="text-red-500 font-bold">!</span>
                <p>{submitError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loadingSubmit}
                className={`w-full font-bold text-lg py-4 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  loadingSubmit 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {loadingSubmit ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : (
                  "Enviar solicitação para a FormaPlay"
                )}
              </button>
            </div>

          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 py-4 text-center border-t border-gray-100">
          <a href="http://localhost:5000" className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors">
            &larr; Voltar para o site da FormaPlay
          </a>
        </div>
      </div>
    </div>
  );
};
