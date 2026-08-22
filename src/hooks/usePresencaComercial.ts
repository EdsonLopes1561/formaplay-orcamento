import { useState, useEffect, useMemo } from 'react';
import { agregarPresencaComercial } from '../utils/geografiaComercial';
import { PresencaCidade } from '../interfaces/geografia';

export interface UsePresencaComercialProps {
  enabled: boolean;
  orcamentos: any[];
  solicitacoes: any[];
  interesses: any[];
}

export interface PresencaComercialIndicadores {
  vendas: number;
  orcamentos: number;
  solicitacoes: number;
  interesses: number;
  sinaisComerciais: number;
  cidadesBrasil: number;
  estadosBrasil: number;
  sinaisNaoResolvidos: number;
  sinaisInternacionais: number;
}

export interface UsePresencaComercialResult {
  nodes: PresencaCidade[];
  indicadores: PresencaComercialIndicadores;
  ufsBrasil: string[];
  loading: boolean;
  error: Error | null;
}

const INDICADORES_ZERADOS: PresencaComercialIndicadores = {
  vendas: 0,
  orcamentos: 0,
  solicitacoes: 0,
  interesses: 0,
  sinaisComerciais: 0,
  cidadesBrasil: 0,
  estadosBrasil: 0,
  sinaisNaoResolvidos: 0,
  sinaisInternacionais: 0,
};

export function usePresencaComercial({
  enabled,
  orcamentos,
  solicitacoes,
  interesses
}: UsePresencaComercialProps): UsePresencaComercialResult {
  const [datasets, setDatasets] = useState<{ cidadesBr: any; coordenadas: any } | null>(null);
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Lazy load datasets when enabled
  useEffect(() => {
    if (!enabled) return;
    if (datasets) return; // already loaded
    
    let isMounted = true;
    
    const loadDatasets = async () => {
      setLoadingDatasets(true);
      setError(null);
      try {
        const [cidadesModule, coordModule] = await Promise.all([
          import('../assets/data/cidades_br.json'),
          import('../assets/data/municipios_coordenadas.json')
        ]);
        
        if (isMounted) {
          setDatasets({
            cidadesBr: cidadesModule.default,
            coordenadas: coordModule.default
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoadingDatasets(false);
        }
      }
    };
    
    loadDatasets();
    
    return () => {
      isMounted = false;
    };
  }, [enabled, datasets]);

  // Aggregate nodes
  const nodes = useMemo(() => {
    if (!enabled || !datasets) return [];
    
    return agregarPresencaComercial({
      orcamentos: orcamentos || [],
      solicitacoes: solicitacoes || [],
      interesses: interesses || [],
      cidadesBr: datasets.cidadesBr,
      coordenadas: datasets.coordenadas
    });
  }, [enabled, datasets, orcamentos, solicitacoes, interesses]);

  // Calculate indicators
  const { indicadores, ufsBrasil } = useMemo(() => {
    if (nodes.length === 0) {
      return { indicadores: INDICADORES_ZERADOS, ufsBrasil: [] };
    }
    
    let vendas = 0;
    let orc = 0;
    let sol = 0;
    let int = 0;
    let totalSinais = 0;
    let cidadesBrasil = 0;
    let naoResolvidos = 0;
    let internacionais = 0;
    
    const ufs = new Set<string>();

    for (const n of nodes) {
      vendas += n.vendas;
      orc += n.orcamentos;
      sol += n.solicitacoes;
      int += n.interesses;
      totalSinais += n.totalSinais;
      
      if (n.resolucao === 'nao-resolvido') {
        naoResolvidos += n.totalSinais;
      } else if (n.resolucao === 'internacional') {
        internacionais += n.totalSinais;
      } else if (n.key.startsWith('BR|')) {
        cidadesBrasil += 1;
      }
      
      if (n.pais === 'Brasil' && n.estado) {
        ufs.add(n.estado);
      }
    }
    
    const ufsSorted = Array.from(ufs).sort();

    return {
      indicadores: {
        vendas,
        orcamentos: orc,
        solicitacoes: sol,
        interesses: int,
        sinaisComerciais: totalSinais,
        cidadesBrasil,
        estadosBrasil: ufs.size,
        sinaisNaoResolvidos: naoResolvidos,
        sinaisInternacionais: internacionais
      },
      ufsBrasil: ufsSorted
    };
  }, [nodes]);

  // If not enabled, return predictable empty state
  if (!enabled) {
    return {
      nodes: [],
      indicadores: INDICADORES_ZERADOS,
      ufsBrasil: [],
      loading: false,
      error: null
    };
  }

  return {
    nodes,
    indicadores,
    ufsBrasil,
    loading: loadingDatasets,
    error
  };
}
