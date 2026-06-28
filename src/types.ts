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
  cliente_endereco_completo?: string;
  proxima_acao?: string;
  data_retorno?: string;
  observacao_interna?: string;
  prioridade?: string;
  created_at?: string;
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
