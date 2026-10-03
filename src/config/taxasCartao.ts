/**
 * Tabela e funções de cálculo de parcelamento no cartão de crédito.
 * 
 * REGRA DE NEGÓCIO IMPORTANTE:
 * As porcentagens das taxas são de uso ESTRITAMENTE INTERNO para cálculo.
 * NUNCA exibir porcentagens na interface pública nem no PDF de orçamento/pedido.
 */

export const TAXAS_OPERADORA_CARTAO: Record<number, number> = {
  1: 0.0399,  // 3.99% à vista
  2: 0.0549,  // 5.49%
  3: 0.0649,  // 6.49%
  4: 0.0749,  // 7.49%
  5: 0.0849,  // 8.49%
  6: 0.0949,  // 9.49%
  7: 0.1049,  // 10.49%
  8: 0.1149,  // 11.49%
  9: 0.1249,  // 12.49%
  10: 0.1349, // 13.49%
  11: 0.1449, // 14.49%
  12: 0.1549, // 15.49%
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
    const taxa = TAXAS_OPERADORA_CARTAO[n] ?? (0.0399 + (n - 1) * 0.01);
    const totalComAcrescimo = Math.round(valorBase * (1 + taxa) * 100) / 100;
    const valorParcela = Math.round((totalComAcrescimo / n) * 100) / 100;
    
    const parcelaFmt = valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const totalFmt = totalComAcrescimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let textoFormatado = '';
    if (n === 1) {
      textoFormatado = `1x de ${parcelaFmt}`;
    } else {
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
