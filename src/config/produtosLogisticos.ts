export type VolumeLogistico = {
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  quantidadeItens: number;
};

export type ProdutoLogistico = {
  nome: string;
  pesoUnitarioKg: number;
  alturaUnitarioCm: number;
  larguraCm: number;
  comprimentoCm: number;
  maximoUnidadesPorVolume: number;
  valorDeclaradoUnitario?: number;
};

export const PRODUTOS_LOGISTICOS: Record<string, ProdutoLogistico> = {
  'Desafio Logístico': {
    nome: 'Desafio Logístico',
    pesoUnitarioKg: 2,
    alturaUnitarioCm: 7,
    larguraCm: 32,
    comprimentoCm: 50,
    maximoUnidadesPorVolume: 10,
  },
  // Estrutura preparada para futuros produtos
  'Desafio Logístico Premium': {
    nome: 'Desafio Logístico Premium',
    pesoUnitarioKg: 2.5, // Exemplo, pode ser ajustado depois
    alturaUnitarioCm: 8,
    larguraCm: 35,
    comprimentoCm: 55,
    maximoUnidadesPorVolume: 5,
  },
  'Desafio Kids': {
    nome: 'Desafio Kids',
    pesoUnitarioKg: 1,
    alturaUnitarioCm: 5,
    larguraCm: 25,
    comprimentoCm: 25,
    maximoUnidadesPorVolume: 15,
  },
  'Edição do Professor': {
    nome: 'Edição do Professor',
    pesoUnitarioKg: 1.5,
    alturaUnitarioCm: 6,
    larguraCm: 30,
    comprimentoCm: 40,
    maximoUnidadesPorVolume: 10,
  }
};

/**
 * Função responsável por calcular e dividir os volumes conforme a quantidade solicitada.
 * Regra:
 * - Até 'maximoUnidadesPorVolume' vão em 1 volume.
 * - Acima disso, divide-se em múltiplos volumes.
 * - Peso = quantidade no volume * peso unitário.
 * - Altura = quantidade no volume * altura unitária.
 * - Largura e comprimento permanecem os da base do pacote.
 */
export const calcularVolumes = (produtoNome: string, quantidadeTotal: number): VolumeLogistico[] => {
  const cfg = PRODUTOS_LOGISTICOS[produtoNome] || PRODUTOS_LOGISTICOS['Desafio Logístico']; // Fallback seguro
  
  const volumes: VolumeLogistico[] = [];
  let quantidadeRestante = quantidadeTotal;

  while (quantidadeRestante > 0) {
    const qtdNoVolume = Math.min(quantidadeRestante, cfg.maximoUnidadesPorVolume);
    volumes.push({
      peso: qtdNoVolume * cfg.pesoUnitarioKg,
      altura: qtdNoVolume * cfg.alturaUnitarioCm,
      largura: cfg.larguraCm,
      comprimento: cfg.comprimentoCm,
      quantidadeItens: qtdNoVolume
    });
    quantidadeRestante -= qtdNoVolume;
  }

  return volumes;
};
