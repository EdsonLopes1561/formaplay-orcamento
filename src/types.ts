export interface Cliente {
  id?: string;
  nome: string;
  razao_social?: string;
  nome_fantasia?: string;
  documento: string;
  inscricao_estadual: string;
  email: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais?: string;
  complemento: string;
  contato_responsavel?: string;
  tipo_cliente: string;
  observacoes: string;
  created_at?: string;
}

export interface Orcamento {
  id?: string;
  numero: string;
  cliente: string;
  telefone: string;
  cidade: string;
  email: string;
  produto: string;
  quantidade: number;
  valor_unitario: number;
  frete: number;
  desconto: number;
  subtotal: number;
  total: number;
  prazo_entrega: string;
  validade: string;
  pagamento: string;
  tipo_frete?: string;
  frete_incluso?: boolean;
  observacao_frete?: string;
  forma_pagamento_personalizada?: string;
  condicoes_pagamento?: string;
  informacoes_complementares?: string;
  observacoes: string;
  data_orcamento: string;
  status: string;
  cliente_id?: string;
  cliente_nome?: string;
  cliente_razao_social?: string;
  cliente_nome_fantasia?: string;
  cliente_documento?: string;
  cliente_inscricao_estadual?: string;
  cliente_contato_responsavel?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  cliente_cep?: string;
  cliente_logradouro?: string;
  cliente_numero?: string;
  cliente_complemento?: string;
  cliente_bairro?: string;
  cliente_cidade?: string;
  cliente_uf?: string;
  cliente_pais?: string | null;
  cliente_endereco_completo?: string;
  proxima_acao?: string;
  data_retorno?: string;
  observacao_interna?: string;
  prioridade?: string;
  created_at?: string;
  itens?: ItemOrcamentoSnapshot[];
  
  // Acompanhamento Público e Nota Fiscal
  token_publico?: string | null;
  status_acompanhamento?: string | null;
  status_atualizado_em?: string | null;
  observacao_publica_status?: string | null;
  nf_emitida?: boolean | null;
  nf_numero?: string | null;
  nf_emitida_em?: string | null;
  nf_pdf_url?: string | null;
  
  // Entrega e Rastreamento
  transportadora?: string | null;
  codigo_rastreio?: string | null;
  link_rastreio?: string | null;
  data_envio?: string | null;
  previsao_entrega?: string | null;
  data_entrega?: string | null;
  observacao_entrega_publica?: string | null;
  
  // Ordem de Produção
  status_producao?: string | null;
  producao_checklist?: string[] | null;
  observacao_producao?: string | null;
  producao_atualizado_em?: string | null;
  prioridade_producao?: 'Normal' | 'Alta' | 'Urgente';
  prazo_producao?: string | null;
  observacao_prioridade?: string | null;
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  revisao: string;
  categoria?: string;
  preco_base: number;
  peso_kg: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
  maximo_unidades_por_volume: number;
  status_comercial: string;
  quantidade_estoque: number;
  controlar_estoque: boolean;
  ativo: boolean;
  mensagem_publica?: string;
  descricao_curta?: string;
  descricao_completa?: string;
  observacao_interna?: string;
  imagem_url?: string;
  criado_em: string;
  atualizado_em: string;
}

export const formatarCampoCliente = (valor?: string | null): string => {
  if (!valor || valor.trim() === '') return 'Não informado';
  return valor;
};

export interface SolicitacaoOrcamento {
  id: string;
  codigo: string;
  nome_razao: string;
  cpf_cnpj: string | null;
  telefone: string;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais?: string | null;
  jogo_escolhido: string;
  quantidade: number;
  valor_estimado: number;
  frete_estimado: number;
  desconto_pix: number;
  total_estimado: number;
  forma_pagamento: string;
  embrulho_presente: boolean;
  status: string;
  observacoes_cliente: string | null;
  created_at: string;
  itens?: ItemOrcamentoSnapshot[];
  orcamento_id?: string | null;
}

export const EMPRESA = {
  nome: 'FormaPlay Jogos Educacionais',
  cnpj: '66.710.107/0001-31',
  whatsapp: '(14) 9 9844-2917',
  whatsappNumero: '5514998442917',
  email: 'contato.formaplay@gmail.com',
};

export const PRODUTOS = [
  { nome: 'Desafio Logístico', preco: 290 },
  { nome: 'Desafio Logístico Premium', preco: 390 },
  { nome: 'Desafio Kids', preco: 190 },
  { nome: 'Edição Professor', preco: 390 },
];

export const emptyOrcamento = (): Omit<Orcamento, 'id' | 'created_at'> => ({
  numero: '',
  cliente: '',
  telefone: '',
  cidade: '',
  email: '',
  produto: '',
  quantidade: 1,
  valor_unitario: 0,
  frete: 0,
  desconto: 0,
  subtotal: 0,
  total: 0,
  prazo_entrega: 'A combinar',
  validade: '15 dias',
  pagamento: '',
  tipo_frete: 'A combinar',
  frete_incluso: false,
  observacao_frete: '',
  forma_pagamento_personalizada: '',
  condicoes_pagamento: '',
  informacoes_complementares: '',
  observacoes: '',
  data_orcamento: new Date().toLocaleDateString('pt-BR'),
  status: 'Aberto',
  prioridade: 'Baixa',
  proxima_acao: '',
  data_retorno: '',
  observacao_interna: '',
});

export interface ItemOrcamentoSnapshot {
  produto_id?: string;
  sku: string;
  revisao: string;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  desconto_item?: number;
  subtotal: number;
  peso_kg: number;
  altura_cm: number;
  largura_cm: number;
  comprimento_cm: number;
  maximo_unidades_por_volume: number;
  imagem_url?: string;
  descricao_curta?: string;
  origem: 'catalogo' | 'fallback' | 'legado';
}

