/**
 * Tabela e funções de cálculo de parcelamento no cartão de crédito (Taxas Nubank).
 * 
 * REGRA DE NEGÓCIO IMPORTANTE:
 * 1. CARTÃO EM 1X:
 *    - Taxa de 3,99% é absorvida integralmente pela FormaPlay.
 *    - O cliente paga SEM JUROS / SEM ACRÉSCIMO (valor em 1x = total base do orçamento).
 *    - Formato de exibição: "1x sem juros — R$ XXX,XX".
 * 
 * 2. CARTÃO DE 2X A 12X (Taxas Nubank):
 *    - 2x: 5,99%
 *    - 3x: 6,99%
 *    - 4x: 7,89%
 *    - 5x: 8,79%
 *    - 6x: 9,59%
 *    - 7x: 10,49%
 *    - 8x: 11,49%
 *    - 9x: 13,99%
 *    - 10x: 14,99%
 *    - 11x: 15,79%
 *    - 12x: 16,49%
 *    - Fórmula: valorCobrado = totalBase / (1 - taxa)
 *    - Preserva o valor líquido da FormaPlay.
 *    - Formato de exibição: "Nx de R$ XX,XX — total R$ XXX,XX".
 * 
 * 3. ZERO PORCENTAGENS:
 *    - As porcentagens das taxas são de uso ESTRITAMENTE INTERNO para cálculo.
 *    - NUNCA exibir porcentagens na interface pública, painel de orçamento nem no PDF.
 */

export const TAXAS_OPERADORA_CARTAO: Record<number, number> = {
  1: 0.0399,  // 3.99% (absorvida pela FormaPlay)
  2: 0.0599,  // 5.99%
  3: 0.0699,  // 6.99%
  4: 0.0789,  // 7.89%
  5: 0.0879,  // 8.79%
  6: 0.0959,  // 9.59%
  7: 0.1049,  // 10.49%
  8: 0.1149,  // 11.49%
  9: 0.1399,  // 13.99%
  10: 0.1499, // 14.99%
  11: 0.1579, // 15.79%
  12: 0.1649, // 16.49%
};

export interface OpcaoParcela {
  parcelas: number;
  valorParcela: number;
  totalComAcrescimo: number;
  textoFormatado: string;
}

export function calcularOpcoesParcelamento(valorBase: number): OpcaoParcela[] {
  if (!valorBase || valorBase <= 0) return [];

  const opcoes: OpcaoParcela[] = [];

  for (let n = 1; n <= 12; n++) {
    let totalComAcrescimo = 0;
    let valorParcela = 0;
    let textoFormatado = '';

    if (n === 1) {
      // 1x é SEM JUROS para o cliente (FormaPlay absorve a taxa de 3,99%)
      totalComAcrescimo = Math.round(valorBase * 100) / 100;
      valorParcela = totalComAcrescimo;
      const parcelaFmt = valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      textoFormatado = `1x sem juros — ${parcelaFmt}`;
    } else {
      // 2x a 12x: valorCobrado = totalBase / (1 - taxa)
      const taxa = TAXAS_OPERADORA_CARTAO[n] ?? 0.1649;
      const valorBruto = valorBase / (1 - taxa);
      totalComAcrescimo = Math.round(valorBruto * 100) / 100;
      valorParcela = Math.round((valorBruto / n) * 100) / 100;
      
      const parcelaFmt = valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const totalFmt = totalComAcrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      textoFormatado = `${n}x de ${parcelaFmt} — total ${totalFmt}`;
    }

    opcoes.push({
      parcelas: n,
      valorParcela,
      totalComAcrescimo,
      textoFormatado
    });
  }

  return opcoes;
}

export function formatarTextoCondicoesCartao(valorBase: number, parcelas: number): string {
  const opcoes = calcularOpcoesParcelamento(valorBase);
  const op = opcoes.find(o => o.parcelas === parcelas) || opcoes[0];
  if (!op) return '';

  const totalFmt = op.totalComAcrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const parcelaFmt = op.valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (op.parcelas === 1) {
    return `Forma de pagamento: Cartão de crédito\nParcelamento: 1x sem juros\nTotal no cartão: ${totalFmt}`;
  }

  return `Forma de pagamento: Cartão de crédito\nParcelamento: ${op.parcelas}x de ${parcelaFmt}\nTotal no cartão: ${totalFmt}`;
}

export function extrairNumeroParcelas(texto?: string | null): number {
  if (!texto) return 1;
  const match = texto.match(/(\d{1,2})\s*x/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 12) return num;
  }
  return 1;
}
