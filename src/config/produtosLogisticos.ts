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
    pesoUnitarioKg: 2,
    alturaUnitarioCm: 7,
    larguraCm: 32,
    comprimentoCm: 50,
    maximoUnidadesPorVolume: 10,
  },
  'Desafio Kids': {
    nome: 'Desafio Kids',
    pesoUnitarioKg: 2,
    alturaUnitarioCm: 7,
    larguraCm: 32,
    comprimentoCm: 50,
    maximoUnidadesPorVolume: 10,
  },
  'Edição do Professor': {
    nome: 'Edição do Professor',
    pesoUnitarioKg: 2,
    alturaUnitarioCm: 7,
    larguraCm: 32,
    comprimentoCm: 50,
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

/**
 * Agrupa os itens do carrinho que possuem exatamente os mesmos atributos físicos de logística
 * e divide-os em volumes adequados.
 * Retorna null se houver algum produto com especificações inválidas (peso ou dimensões <= 0),
 * sinalizando que o frete deve ser calculado de forma manual ("A combinar").
 */
export const calcularVolumesMultiProdutos = (
  itens: { nome: string; quantidade: number }[],
  produtosDisponiveis: {
    nome: string;
    peso_kg: number;
    altura_cm: number;
    largura_cm: number;
    comprimento_cm: number;
    maximo_unidades_por_volume: number;
  }[]
): VolumeLogistico[] | null => {
  if (!itens || itens.length === 0) return [];

  // 1. Mapeia cada item do carrinho para suas especificações físicas
  const itensEspecificados = itens.map(item => {
    // Busca na lista carregada do banco
    const dbProd = produtosDisponiveis.find(p => p.nome === item.nome);
    
    let peso_kg = 0;
    let altura_cm = 0;
    let largura_cm = 0;
    let comprimento_cm = 0;
    let maximo_unidades_por_volume = 1;

    if (dbProd) {
      peso_kg = dbProd.peso_kg || 0;
      altura_cm = dbProd.altura_cm || 0;
      largura_cm = dbProd.largura_cm || 0;
      comprimento_cm = dbProd.comprimento_cm || 0;
      maximo_unidades_por_volume = dbProd.maximo_unidades_por_volume || 1;
    } else {
      // Tenta fallback local
      const fbProd = PRODUTOS_LOGISTICOS[item.nome] || PRODUTOS_LOGISTICOS['Desafio Logístico'];
      if (fbProd) {
        peso_kg = fbProd.pesoUnitarioKg;
        altura_cm = fbProd.alturaUnitarioCm;
        largura_cm = fbProd.larguraCm;
        comprimento_cm = fbProd.comprimentoCm;
        maximo_unidades_por_volume = fbProd.maximoUnidadesPorVolume;
      }
    }

    return {
      nome: item.nome,
      quantidade: item.quantidade,
      peso_kg,
      altura_cm,
      largura_cm,
      comprimento_cm,
      maximo_unidades_por_volume
    };
  });

  // 2. Valida se todos os itens possuem dados logísticos positivos e válidos
  for (const item of itensEspecificados) {
    if (
      item.peso_kg <= 0 ||
      item.altura_cm <= 0 ||
      item.largura_cm <= 0 ||
      item.comprimento_cm <= 0 ||
      item.maximo_unidades_por_volume <= 0
    ) {
      console.warn(`[Logística] Produto ${item.nome} possui medidas inválidas. Abortando cotação automática.`);
      return null;
    }
  }

  // 3. Agrupa produtos que possuem características físicas idênticas
  const grupos: Record<string, {
    quantidadeTotal: number;
    peso_kg: number;
    altura_cm: number;
    largura_cm: number;
    comprimento_cm: number;
    maximo_unidades_por_volume: number;
  }> = {};

  for (const item of itensEspecificados) {
    const chave = `${item.peso_kg}_${item.altura_cm}_${item.largura_cm}_${item.comprimento_cm}_${item.maximo_unidades_por_volume}`;
    if (!grupos[chave]) {
      grupos[chave] = {
        quantidadeTotal: item.quantidade,
        peso_kg: item.peso_kg,
        altura_cm: item.altura_cm,
        largura_cm: item.largura_cm,
        comprimento_cm: item.comprimento_cm,
        maximo_unidades_por_volume: item.maximo_unidades_por_volume
      };
    } else {
      grupos[chave].quantidadeTotal += item.quantidade;
    }
  }

  // 4. Divide cada grupo em volumes físicos
  const volumesFinais: VolumeLogistico[] = [];

  for (const chave in grupos) {
    const grupo = grupos[chave];
    let restante = grupo.quantidadeTotal;

    while (restante > 0) {
      const qtdNoVolume = Math.min(restante, grupo.maximo_unidades_por_volume);
      volumesFinais.push({
        peso: qtdNoVolume * grupo.peso_kg,
        altura: qtdNoVolume * grupo.altura_cm,
        largura: grupo.largura_cm,
        comprimento: grupo.comprimento_cm,
        quantidadeItens: qtdNoVolume
      });
      restante -= qtdNoVolume;
    }
  }

  return volumesFinais;
};
