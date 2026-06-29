import { Produto } from '../types';

export const PRODUTOS_FALLBACK: Produto[] = [
  {
    id: '1560970c-a1ce-4593-ac3f-dcf1ba1f5d70',
    nome: 'Desafio Logístico',
    sku: 'FP-DL-R00',
    revisao: 'R00',
    categoria: 'Jogo de tabuleiro educacional',
    preco_base: 290.00,
    peso_kg: 2.0,
    altura_cm: 7,
    largura_cm: 32,
    comprimento_cm: 50,
    maximo_unidades_por_volume: 10,
    status_comercial: 'disponivel',
    quantidade_estoque: 0,
    controlar_estoque: false,
    ativo: true,
    mensagem_publica: 'Produto disponível para solicitação de orçamento.',
    descricao_curta: 'Jogo educacional de logística, estratégia e tomada de decisão.',
    criado_em: '2026-06-28T20:13:03.442Z',
    atualizado_em: '2026-06-28T20:13:03.442Z'
  },
  {
    id: '4ef708ea-5997-4c42-a881-9ee2bc938b7c',
    nome: 'Desafio Logístico Premium',
    sku: 'FP-DLP-R00',
    revisao: 'R00',
    categoria: 'Jogo de tabuleiro educacional premium',
    preco_base: 390.00,
    peso_kg: 2.5,
    altura_cm: 8,
    largura_cm: 35,
    comprimento_cm: 55,
    maximo_unidades_por_volume: 5,
    status_comercial: 'sob_encomenda',
    quantidade_estoque: 0,
    controlar_estoque: false,
    ativo: true,
    mensagem_publica: 'Produto sob encomenda. A FormaPlay confirmará prazo e disponibilidade.',
    descricao_curta: 'Versão premium do Desafio Logístico com acabamento e apresentação diferenciados.',
    criado_em: '2026-06-28T20:13:03.442Z',
    atualizado_em: '2026-06-28T20:13:03.442Z'
  },
  {
    id: '7565b0b4-805c-48bf-84ba-cba1a8a018c4',
    nome: 'Desafio Kids',
    sku: 'FP-DK-R00',
    revisao: 'R00',
    categoria: 'Jogo educacional infantil',
    preco_base: 190.00,
    peso_kg: 1.0,
    altura_cm: 5,
    largura_cm: 25,
    comprimento_cm: 25,
    maximo_unidades_por_volume: 15,
    status_comercial: 'reposicao_em_breve',
    quantidade_estoque: 0,
    controlar_estoque: false,
    ativo: true,
    mensagem_publica: 'Produto em preparação para nova disponibilidade. Cadastre seu interesse para ser avisado.',
    descricao_curta: 'Jogo educacional infantil com foco em aprendizado, segurança e tomada de decisão.',
    criado_em: '2026-06-28T20:13:03.442Z',
    atualizado_em: '2026-06-28T20:13:03.442Z'
  },
  {
    id: 'c4c0bf31-efc5-4916-93da-95929b344b12',
    nome: 'Edição do Professor',
    sku: 'FP-EP-R00',
    revisao: 'R00',
    categoria: 'Material educacional para aplicação em sala',
    preco_base: 390.00,
    peso_kg: 1.5,
    altura_cm: 6,
    largura_cm: 30,
    comprimento_cm: 40,
    maximo_unidades_por_volume: 10,
    status_comercial: 'disponivel',
    quantidade_estoque: 0,
    controlar_estoque: false,
    ativo: true,
    mensagem_publica: 'Produto disponível para solicitação de orçamento.',
    descricao_curta: 'Edição voltada para educadores, instrutores e aplicação em sala de aula.',
    criado_em: '2026-06-28T20:13:03.442Z',
    atualizado_em: '2026-06-28T20:13:03.442Z'
  },
  {
    id: 'a47c9294-9a8c-47f5-b6f0-e4f5c3c3e30e',
    nome: 'Desafio de Cartas',
    sku: 'FP-DC-R00',
    revisao: 'R00',
    categoria: 'Jogo educacional de cartas',
    preco_base: 149.00,
    peso_kg: 0.6,
    altura_cm: 5,
    largura_cm: 15,
    comprimento_cm: 20,
    maximo_unidades_por_volume: 20,
    status_comercial: 'em_desenvolvimento',
    quantidade_estoque: 0,
    controlar_estoque: false,
    ativo: true,
    mensagem_publica: 'Este jogo está em desenvolvimento pela FormaPlay. Cadastre seu interesse para receber novidades.',
    descricao_curta: 'Jogo educacional de cartas com dinâmica de perguntas, respostas e estratégia.',
    imagem_url: 'https://jllnonveblpzdcefeegw.supabase.co/storage/v1/object/public/product-images/produtos/FP-DC-R00/1782699427568-6qkqnx.png',
    criado_em: '2026-06-28T20:13:03.442Z',
    atualizado_em: '2026-06-28T20:13:03.442Z'
  }
];

/**
 * Normaliza o nome do produto para manter compatibilidade com nomes antigos do sistema
 */
export function normalizarNomeProduto(nome: string): string {
  const n = (nome || '').trim();
  if (n === 'Desafio Premium') return 'Desafio Logístico Premium';
  if (n === 'Edição Professor') return 'Edição do Professor';
  return n;
}

/**
 * Busca dados de fallback de um produto pelo nome (normalizando antes)
 */
export function obterProdutoFallback(nome: string): Produto | undefined {
  const nomeNormalizado = normalizarNomeProduto(nome);
  return PRODUTOS_FALLBACK.find(p => p.nome.toLowerCase() === nomeNormalizado.toLowerCase());
}
