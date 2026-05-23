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
  observacoes: string;
  data_orcamento: string;
  created_at?: string;
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
  observacoes: '',
  data_orcamento: new Date().toLocaleDateString('pt-BR'),
});
