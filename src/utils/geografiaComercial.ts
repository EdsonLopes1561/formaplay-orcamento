import { Orcamento, SolicitacaoOrcamento } from '../types';
import { InteresseModelo } from '../types/interesses';
import { PresencaCidade, ResolucaoGeografica } from '../types/geografia';
import { normalizeText, ESTADOS_BR } from './locationUtils';

interface CidadesBrData {
  [uf: string]: { nome: string; codigoIbge?: string }[];
}

interface CoordenadasData {
  codigoIbge: string;
  lat: number;
  lng: number;
}

export interface InputAgregacao {
  orcamentos: Orcamento[];
  solicitacoes: SolicitacaoOrcamento[];
  interesses: InteresseModelo[];
  cidadesBr: CidadesBrData;
  coordenadas: CoordenadasData[];
}

interface IndiceCidades {
  porUfeNome: Map<string, { nome: string; codigoIbge: string }>; // key: UF|nomeNormalizado
  nacionalPorNome: Map<string, { uf: string; nome: string; codigoIbge: string }[]>; // key: nomeNormalizado
}

function criarIndices(cidadesBr: CidadesBrData): IndiceCidades {
  const porUfeNome = new Map<string, { nome: string; codigoIbge: string }>();
  const nacionalPorNome = new Map<string, { uf: string; nome: string; codigoIbge: string }[]>();

  for (const uf of Object.keys(cidadesBr)) {
    for (const cid of cidadesBr[uf]) {
      if (!cid.codigoIbge) continue;
      
      const nomeNorm = normalizeText(cid.nome);
      porUfeNome.set(`${uf}|${nomeNorm}`, { nome: cid.nome, codigoIbge: cid.codigoIbge });

      const lista = nacionalPorNome.get(nomeNorm) || [];
      lista.push({ uf, nome: cid.nome, codigoIbge: cid.codigoIbge });
      nacionalPorNome.set(nomeNorm, lista);
    }
  }

  return { porUfeNome, nacionalPorNome };
}

function extrairLocalizacaoOrcamento(orc: Orcamento) {
  // BLOCO SNAPSHOT
  // Se houver qualquer dado no bloco cliente_*, usamos este bloco exclusivamente
  if (orc.cliente_pais || orc.cliente_uf || orc.cliente_cidade) {
    return { 
      pais: orc.cliente_pais || null, 
      estado: orc.cliente_uf || null, 
      cidade: orc.cliente_cidade || null 
    };
  }

  // FALLBACK LEGADO
  // Somente se o snapshot não fornecer localização útil, utilizamos as raízes
  return { 
    pais: null, 
    estado: null, 
    cidade: orc.cidade || null 
  };
}

export function agregarPresencaComercial({ orcamentos, solicitacoes, interesses, cidadesBr, coordenadas }: InputAgregacao): PresencaCidade[] {
  const indices = criarIndices(cidadesBr);
  const coordsMap = new Map<string, { lat: number; lng: number }>();
  
  for (const c of coordenadas) {
    coordsMap.set(c.codigoIbge, { lat: c.lat, lng: c.lng });
  }

  const mapResult = new Map<string, PresencaCidade>();

  const processarSinal = (
    tipo: 'vendas' | 'orcamentos' | 'solicitacoes' | 'interesses',
    pais: string | null,
    estado: string | null,
    cidade: string | null
  ) => {
    let p = pais ? pais.trim() : null;
    let u = estado ? estado.trim() : null;
    let c = cidade ? cidade.trim() : null;

    let resolucao: ResolucaoGeografica = 'nao-resolvido';
    let codigoIbge: string | undefined = undefined;
    let key = 'DESCONHECIDO';
    
    // País não pode ser inventado. Inicia com o que veio (pode ser null).
    let finalPais = p;
    let finalEstado = u;
    let finalCidade = c;

    // Se é claramente internacional
    if (p && normalizeText(p) !== 'brasil') {
      resolucao = 'internacional';
      key = `INT|${normalizeText(p)}|${u ? normalizeText(u) : ''}|${c ? normalizeText(c) : ''}`;
    } else {
      // É Brasil (explícito) ou não informado (null)
      // Tentar resolver como Brasil se houver evidência (UF válida ou Cidade válida nacionalmente)
      
      // Tratar legado com /UF primeiro
      if (!u && c && (c.includes('/') || c.includes('-'))) {
        const parts = c.split(/[/|-]/);
        if (parts.length >= 2) {
          const potentialUF = parts[parts.length - 1].trim().toUpperCase();
          const isValidUF = ESTADOS_BR.some(e => e.sigla === potentialUF);
          if (isValidUF) {
            u = potentialUF;
            c = parts.slice(0, parts.length - 1).join('-').trim();
            finalEstado = u;
            finalCidade = c;
            resolucao = 'legado-extraido';
          }
        }
      }

      const cNorm = c ? normalizeText(c) : '';
      const uNorm = u ? u.toUpperCase() : '';

      if (uNorm && cNorm) {
        // Evidência de UF. Assume Brasil.
        finalPais = 'Brasil';
        const achou = indices.porUfeNome.get(`${uNorm}|${cNorm}`);
        if (achou) {
          codigoIbge = achou.codigoIbge;
          finalCidade = achou.nome;
          resolucao = resolucao === 'legado-extraido' ? 'legado-extraido' : 'estruturado';
          key = `BR|${codigoIbge}`;
        } else {
          key = `UF|${uNorm}`;
          resolucao = 'nao-resolvido';
        }
      } else if (!uNorm && cNorm) {
        // Legado sem UF - tentar resolver por nome único
        const candidatos = indices.nacionalPorNome.get(cNorm);
        if (candidatos && candidatos.length === 1) {
          // Evidência de unicidade. Assume Brasil e UF encontrada.
          finalPais = 'Brasil';
          codigoIbge = candidatos[0].codigoIbge;
          finalCidade = candidatos[0].nome;
          finalEstado = candidatos[0].uf;
          resolucao = 'legado-unico';
          key = `BR|${codigoIbge}`;
        } else {
          // Ambiguidade (0 ou 2+). NÃO assume Brasil. Deixa como não-resolvido.
          key = `DESCONHECIDO_CIDADE|${cNorm}`;
          resolucao = 'nao-resolvido';
        }
      } else if (uNorm && !cNorm) {
        // Só tem UF. Assume Brasil.
        finalPais = 'Brasil';
        key = `UF|${uNorm}`;
        resolucao = 'nao-resolvido';
      } else {
        // Tudo vazio, ou apenas país.
        if (p && normalizeText(p) === 'brasil') {
           finalPais = 'Brasil';
           key = 'BR_VAZIO';
        } else {
           key = 'DESCONHECIDO';
        }
        resolucao = 'nao-resolvido';
      }
    }

    if (!mapResult.has(key)) {
      mapResult.set(key, {
        key,
        pais: finalPais,
        estado: finalEstado,
        cidade: finalCidade,
        codigoIbge,
        lat: codigoIbge ? coordsMap.get(codigoIbge)?.lat : undefined,
        lng: codigoIbge ? coordsMap.get(codigoIbge)?.lng : undefined,
        vendas: 0,
        orcamentos: 0,
        solicitacoes: 0,
        interesses: 0,
        totalSinais: 0,
        resolucao
      });
    }

    const node = mapResult.get(key)!;
    node[tipo] += 1;
    node.totalSinais += 1;
  };

  for (const o of orcamentos) {
    if (o.status === 'Recusado' || o.status === 'Cancelado') continue;
    
    const loc = extrairLocalizacaoOrcamento(o);
    if (o.status === 'Aprovado') {
      processarSinal('vendas', loc.pais, loc.estado, loc.cidade);
    } else if (o.status === 'Aberto' || o.status === 'Enviado') {
      processarSinal('orcamentos', loc.pais, loc.estado, loc.cidade);
    }
  }

  for (const s of solicitacoes) {
    // Solicitacoes: exclui APENAS Spam. (Arquivada conta)
    if (s.status === 'Spam') continue;
    processarSinal('solicitacoes', s.pais || null, s.estado || null, s.cidade || null);
  }

  for (const i of interesses) {
    // Interesses: NÃO exclui (nem sem_interesse, nem arquivado). Todos contam como sinal histórico.
    processarSinal('interesses', i.pais || null, i.estado || null, i.cidade || null);
  }

  return Array.from(mapResult.values());
}
