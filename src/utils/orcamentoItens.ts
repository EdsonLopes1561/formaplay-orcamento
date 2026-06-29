import { Produto, ItemOrcamentoSnapshot } from '../types';
import { obterProdutoFallback, normalizarNomeProduto } from '../config/produtosFallback';

/**
 * Cria um snapshot de item de orçamento a partir de um objeto Produto cadastrado.
 */
export function criarItemSnapshot(
  produto: Produto,
  quantidade: number,
  valorUnitarioOverride?: number
): ItemOrcamentoSnapshot {
  const valor_unitario = valorUnitarioOverride !== undefined ? valorUnitarioOverride : produto.preco_base;
  const qty = Math.max(1, quantidade);
  return {
    produto_id: produto.id,
    sku: produto.sku,
    revisao: produto.revisao,
    nome: produto.nome,
    quantidade: qty,
    valor_unitario: valor_unitario,
    subtotal: qty * valor_unitario,
    peso_kg: produto.peso_kg,
    altura_cm: produto.altura_cm,
    largura_cm: produto.largura_cm,
    comprimento_cm: produto.comprimento_cm,
    maximo_unidades_por_volume: produto.maximo_unidades_por_volume,
    imagem_url: produto.imagem_url || undefined,
    descricao_curta: produto.descricao_curta || undefined,
    origem: 'catalogo'
  };
}

/**
 * Normaliza a lista de itens de um orçamento.
 * Se a coluna 'itens' já possuir itens cadastrados, retorna eles.
 * Caso contrário, cria um item legado virtual a partir das colunas individuais antigas.
 */
export function normalizarItensOrcamento(orcamento: any): ItemOrcamentoSnapshot[] {
  if (orcamento.itens && Array.isArray(orcamento.itens) && orcamento.itens.length > 0) {
    return orcamento.itens;
  }

  if (!orcamento.produto) {
    return [];
  }

  const nomeNormalizado = normalizarNomeProduto(orcamento.produto);
  const fallback = obterProdutoFallback(nomeNormalizado);
  const qtd = Number(orcamento.quantidade) || 1;
  const unitVal = Number(orcamento.valor_unitario) || 0;

  return [{
    produto_id: fallback?.id,
    sku: fallback?.sku || 'FP-LEGADO',
    revisao: fallback?.revisao || 'R00',
    nome: nomeNormalizado,
    quantidade: qtd,
    valor_unitario: unitVal,
    subtotal: Number(orcamento.subtotal) || (qtd * unitVal),
    peso_kg: fallback?.peso_kg ?? 2.0,
    altura_cm: fallback?.altura_cm ?? 7,
    largura_cm: fallback?.largura_cm ?? 32,
    comprimento_cm: fallback?.comprimento_cm ?? 50,
    maximo_unidades_por_volume: fallback?.maximo_unidades_por_volume ?? 10,
    imagem_url: fallback?.imagem_url || undefined,
    descricao_curta: fallback?.descricao_curta || undefined,
    origem: 'legado'
  }];
}

/**
 * Normaliza a lista de itens de uma solicitação de orçamento.
 * Se a coluna 'itens' já possuir itens cadastrados, retorna eles.
 * Caso contrário, cria um item legado virtual a partir das colunas individuais antigas.
 */
export function normalizarItensSolicitacao(sol: any): ItemOrcamentoSnapshot[] {
  if (sol.itens && Array.isArray(sol.itens) && sol.itens.length > 0) {
    return sol.itens;
  }

  if (!sol.jogo_escolhido) {
    return [];
  }

  const nomeNormalizado = normalizarNomeProduto(sol.jogo_escolhido);
  const fallback = obterProdutoFallback(nomeNormalizado);
  const qtd = Number(sol.quantidade) || 1;
  const total = Number(sol.valor_estimado) || 0;
  const unitVal = total > 0 ? (total / qtd) : (fallback?.preco_base || 0);

  return [{
    produto_id: fallback?.id,
    sku: fallback?.sku || 'FP-LEGADO',
    revisao: fallback?.revisao || 'R00',
    nome: nomeNormalizado,
    quantidade: qtd,
    valor_unitario: unitVal,
    subtotal: total || (qtd * unitVal),
    peso_kg: fallback?.peso_kg ?? 2.0,
    altura_cm: fallback?.altura_cm ?? 7,
    largura_cm: fallback?.largura_cm ?? 32,
    comprimento_cm: fallback?.comprimento_cm ?? 50,
    maximo_unidades_por_volume: fallback?.maximo_unidades_por_volume ?? 10,
    imagem_url: fallback?.imagem_url || undefined,
    descricao_curta: fallback?.descricao_curta || undefined,
    origem: 'legado'
  }];
}

/**
 * Soma o subtotal de todos os itens de uma lista.
 */
export function calcularSubtotalItens(itens: ItemOrcamentoSnapshot[]): number {
  return itens.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
}

/**
 * Soma a quantidade de itens totais de uma lista.
 */
export function calcularQuantidadeTotalItens(itens: ItemOrcamentoSnapshot[]): number {
  return itens.reduce((sum, item) => sum + (Number(item.quantidade) || 0), 0);
}
