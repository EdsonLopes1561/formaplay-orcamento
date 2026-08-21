import { useMemo } from 'react';
import cidadesBrData from '../assets/data/cidades_br.json';
import { normalizeText, ESTADOS_BR } from '../utils/locationUtils';

export { normalizeText };

export interface Cidade {
  nome: string;
  codigoIbge?: string; // Opcional para cidades internacionais no futuro
}

// Estrutura das cidades agrupadas por UF
const cidadesBr = cidadesBrData as Record<string, Cidade[]>;

export const PAISES_DISPONIVEIS = [
  'Brasil',
  'Estados Unidos',
  'Portugal',
  'Argentina',
  'Uruguai',
  'Paraguai',
  'Chile'
];

export function useLocationData() {
  const getPaises = () => PAISES_DISPONIVEIS;

  const getEstados = (pais?: string) => {
    if (pais === 'Brasil') {
      return ESTADOS_BR.map(e => e.sigla);
    }
    // No futuro, se for outro país, retornamos a base dele (por hora array vazio forçará texto livre)
    return [];
  };

  const getCidades = (pais?: string, estado?: string): Cidade[] => {
    if (pais === 'Brasil' && estado && cidadesBr[estado]) {
      return cidadesBr[estado];
    }
    return [];
  };

  return {
    getPaises,
    getEstados,
    getCidades
  };
}
