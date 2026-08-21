import { useMemo } from 'react';
import cidadesBrData from '../assets/data/cidades_br.json';

export const normalizeText = (text: string): string => {
  if (!text) return '';
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

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

export const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
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
