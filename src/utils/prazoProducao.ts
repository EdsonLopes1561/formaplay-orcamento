import { CHECKLIST_PRODUCAO_PADRAO, TOTAL_ETAPAS_PRODUCAO, mapearStatusParaPublico } from '../constants/etapasTimeline';
import { Orcamento } from '../types';

export type CategoriaPrazo = 'atrasado' | 'vence_hoje' | 'atencao' | 'no_prazo' | 'sem_prazo';

export type CategoriaOperacional =
  | 'aguardando_producao'
  | 'em_producao'
  | 'pronto_envio'
  | 'transporte'
  | 'entregue'
  | 'cancelado'
  | 'nao_aprovado';

export interface SituacaoPrazoInfo {
  categoria: CategoriaPrazo;
  textoCurto: string;
  textoDescritivo: string;
  diasUteisRestantes: number | null;
  dataPrazoFormatada: string;
  isoPrazo: string | null;
  tipoOrigem: 'manual' | 'sem_prazo';
}

/**
 * Adiciona dias úteis (segunda a sexta) a uma data base.
 * Suporta dias positivos (futuro) e negativos (passado).
 */
export function adicionarDiasUteis(dataBase: Date, diasUteis: number): Date {
  const result = new Date(dataBase);
  result.setHours(12, 0, 0, 0); // Normaliza para meio-dia para evitar problemas de fuso/DST

  if (diasUteis === 0) return result;

  const step = diasUteis > 0 ? 1 : -1;
  const targetCount = Math.abs(diasUteis);
  let count = 0;

  while (count < targetCount) {
    result.setDate(result.getDate() + step);
    const diaSemana = result.getDay();
    // 0 = Domingo, 6 = Sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      count++;
    }
  }

  return result;
}

/**
 * Calcula a diferença em dias úteis entre duas datas (dataReferencia e dataAlvo).
 * Retorna positivo se dataAlvo for futura, 0 se for hoje, negativo se for passada (atrasada).
 */
export function calcularDiferencaDiasUteis(dataReferencia: Date, dataAlvo: Date): number {
  const dRef = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate(), 12, 0, 0);
  const dAlvo = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate(), 12, 0, 0);

  const diffMs = dAlvo.getTime() - dRef.getTime();
  const diffDiasCalendario = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDiasCalendario === 0) return 0;

  let diasUteis = 0;
  const step = diffDiasCalendario > 0 ? 1 : -1;
  const current = new Date(dRef);

  while (
    (step > 0 && current < dAlvo) ||
    (step < 0 && current > dAlvo)
  ) {
    current.setDate(current.getDate() + step);
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      diasUteis += step;
    }
  }

  return diasUteis;
}

/**
 * Identifica a data-base de prazo do pedido com critério rígido de confiabilidade:
 * Regra:
 * A) Se prazo_producao estiver preenchido (YYYY-MM-DD): usa prazo_producao.
 * B) Se prazo_producao estiver vazio: retorna sem_prazo ("Prazo não definido").
 * NÃO utiliza created_at, data_orcamento ou status_atualizado_em como substituto de aprovação.
 */
export function obterDataPrazoEfetiva(pedido: Partial<Orcamento> & Record<string, any>): {
  dataPrazo: Date | null;
  isoPrazo: string | null;
  tipoOrigem: 'manual' | 'sem_prazo';
} {
  // 1. Prazo Manual registrado na ordem de produção
  if (pedido.prazo_producao && typeof pedido.prazo_producao === 'string' && pedido.prazo_producao.trim() !== '') {
    const parts = pedido.prazo_producao.trim().split('-');
    if (parts.length === 3) {
      const ano = parseInt(parts[0], 10);
      const mes = parseInt(parts[1], 10) - 1;
      const dia = parseInt(parts[2], 10);
      const dataPrazo = new Date(ano, mes, dia, 12, 0, 0);
      if (!isNaN(dataPrazo.getTime())) {
        return {
          dataPrazo,
          isoPrazo: pedido.prazo_producao.trim(),
          tipoOrigem: 'manual'
        };
      }
    }
  }

  // 2. Sem prazo definido explicitamente
  return {
    dataPrazo: null,
    isoPrazo: null,
    tipoOrigem: 'sem_prazo'
  };
}

/**
 * Avalia a situação do prazo de um pedido.
 */
export function avaliarSituacaoPrazo(
  pedido: Partial<Orcamento> & Record<string, any>,
  dataHoje: Date = new Date()
): SituacaoPrazoInfo {
  const { dataPrazo, isoPrazo, tipoOrigem } = obterDataPrazoEfetiva(pedido);

  if (!dataPrazo || tipoOrigem === 'sem_prazo') {
    return {
      categoria: 'sem_prazo',
      textoCurto: 'Sem prazo',
      textoDescritivo: 'Prazo não definido',
      diasUteisRestantes: null,
      dataPrazoFormatada: 'Prazo não definido',
      isoPrazo: null,
      tipoOrigem: 'sem_prazo'
    };
  }

  const diasUteis = calcularDiferencaDiasUteis(dataHoje, dataPrazo);
  const dataFormatada = dataPrazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Classificações:
  if (diasUteis < 0) {
    const absDias = Math.abs(diasUteis);
    return {
      categoria: 'atrasado',
      textoCurto: 'Atrasado',
      textoDescritivo: absDias === 1 ? 'Atrasado há 1 dia útil' : `Atrasado há ${absDias} dias úteis`,
      diasUteisRestantes: diasUteis,
      dataPrazoFormatada: dataFormatada,
      isoPrazo,
      tipoOrigem
    };
  }

  if (diasUteis === 0) {
    return {
      categoria: 'vence_hoje',
      textoCurto: 'Vence hoje',
      textoDescritivo: 'Vence hoje',
      diasUteisRestantes: 0,
      dataPrazoFormatada: dataFormatada,
      isoPrazo,
      tipoOrigem
    };
  }

  if (diasUteis <= 2) {
    return {
      categoria: 'atencao',
      textoCurto: 'Atenção',
      textoDescritivo: diasUteis === 1 ? 'Vence em 1 dia útil' : 'Vence em 2 dias úteis',
      diasUteisRestantes: diasUteis,
      dataPrazoFormatada: dataFormatada,
      isoPrazo,
      tipoOrigem
    };
  }

  return {
    categoria: 'no_prazo',
    textoCurto: 'No prazo',
    textoDescritivo: 'Dentro do prazo',
    diasUteisRestantes: diasUteis,
    dataPrazoFormatada: dataFormatada,
    isoPrazo,
    tipoOrigem
  };
}

/**
 * Classifica operacionalmente o pedido na esteira da fábrica.
 */
export function classificarPedidoProducao(pedido: Partial<Orcamento> & Record<string, any>): CategoriaOperacional {
  const statusComercial = (pedido.status || '').trim();
  const statusAcomp = (pedido.status_acompanhamento || '').trim();
  const statusPublico = mapearStatusParaPublico(statusAcomp);
  const statusProd = (pedido.status_producao || 'Não iniciada').trim();
  const checklist = Array.isArray(pedido.producao_checklist) ? pedido.producao_checklist : [];

  // 1. Cancelado / Recusado
  if (
    statusPublico === 'Cancelado' ||
    statusComercial.toLowerCase() === 'cancelado' ||
    statusComercial.toLowerCase() === 'recusado'
  ) {
    return 'cancelado';
  }

  // 2. Entregue
  if (statusPublico === 'Entregue' || Boolean(pedido.data_entrega)) {
    return 'entregue';
  }

  // 3. Transporte
  if (statusPublico === 'Transporte' || Boolean(pedido.data_envio)) {
    return 'transporte';
  }

  // 4. Verificar autorização para produção (Comercial ou Fase Pública Autorizada)
  const isAprovadoComercial = statusComercial === 'Aprovado';
  const isAutorizadoAcomp =
    Boolean(statusAcomp) &&
    (statusPublico === 'Produção' ||
      statusPublico === 'Transporte' ||
      statusPublico === 'Entregue' ||
      statusAcomp.toLowerCase().includes('autorizado para produção') ||
      statusAcomp.toLowerCase().includes('autorizado para producao') ||
      statusAcomp.toLowerCase().includes('autorização aprovado') ||
      statusAcomp.toLowerCase().includes('autorizacao aprovado') ||
      statusAcomp.toLowerCase().includes('em produção') ||
      statusAcomp.toLowerCase().includes('em producao') ||
      statusAcomp.toLowerCase().includes('nota fiscal') ||
      statusAcomp.toLowerCase().includes('fase de entrega'));

  const isAutorizado = isAprovadoComercial || isAutorizadoAcomp;

  if (!isAutorizado) {
    return 'nao_aprovado';
  }

  // 5. Checklist 17/17 ou Pronto para envio
  if (checklist.length === TOTAL_ETAPAS_PRODUCAO || statusProd === 'Pronto para envio') {
    return 'pronto_envio';
  }

  // 6. Checklist 1..16 ou Em produção / Em conferência
  if (
    (checklist.length > 0 && checklist.length < TOTAL_ETAPAS_PRODUCAO) ||
    statusProd === 'Em produção' ||
    statusProd === 'Em conferência'
  ) {
    return 'em_producao';
  }

  // 7. Checklist 0 / Não iniciada
  return 'aguardando_producao';
}

/**
 * Localiza a próxima etapa pendente no checklist oficial.
 */
export function obterProximaEtapa(
  checklistConcluido: string[] | null | undefined
): { id: string; label: string } | null {
  const concluidosSet = new Set(Array.isArray(checklistConcluido) ? checklistConcluido : []);
  for (const item of CHECKLIST_PRODUCAO_PADRAO) {
    if (!concluidosSet.has(item.id)) {
      return { id: item.id, label: item.label };
    }
  }
  return null;
}

/**
 * Calcula o percentual exato e seguro de conclusão da produção.
 */
export function calcularPercentualProducao(checklistConcluido: string[] | null | undefined): number {
  const qtd = Array.isArray(checklistConcluido) ? checklistConcluido.length : 0;
  return Math.min(
    100,
    Math.max(0, Math.round((qtd / TOTAL_ETAPAS_PRODUCAO) * 100))
  );
}

/**
 * Formata data de criação informativa e factual.
 */
export function formatarDataCriacao(dataCriacaoStr?: string | null, dataOrcamentoStr?: string | null): string {
  if (dataOrcamentoStr && dataOrcamentoStr.includes('/')) return dataOrcamentoStr;
  if (!dataCriacaoStr) return 'Não informada';
  const d = new Date(dataCriacaoStr);
  if (isNaN(d.getTime())) return 'Não informada';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formata data de atualização amigável e factual (sem inventar operador).
 */
export function formatarDataAtualizacao(isoString?: string | null): string {
  if (!isoString) return 'Nunca';
  const data = new Date(isoString);
  if (isNaN(data.getTime())) return 'Nunca';

  const agora = new Date();
  const diffMs = agora.getTime() - data.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMin < 2) return 'Agora mesmo';
  if (diffMin < 60) return `Há ${diffMin} min`;
  if (diffHoras < 24 && agora.getDate() === data.getDate()) {
    return `Hoje às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (ontem.getDate() === data.getDate() && ontem.getMonth() === data.getMonth() && ontem.getFullYear() === data.getFullYear()) {
    return `Ontem às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcula o tier e sub-score de ordenação para a fila da Torre de Controle.
 */
export function calcularTierOrdenacao(
  pedido: Partial<Orcamento> & Record<string, any>,
  situacaoPrazo: SituacaoPrazoInfo,
  categoriaOperacional: CategoriaOperacional
): { tier: number; subScore: number } {
  const isFinalizado = 
    categoriaOperacional === 'transporte' || 
    categoriaOperacional === 'entregue' || 
    categoriaOperacional === 'cancelado';
  
  if (!isFinalizado) {
    // 1. Atrasados (maior atraso primeiro -> diasUteisRestantes mais negativo)
    if (situacaoPrazo.categoria === 'atrasado' && situacaoPrazo.diasUteisRestantes !== null) {
      return { tier: 1, subScore: situacaoPrazo.diasUteisRestantes };
    }
    // 2. Vence hoje
    if (situacaoPrazo.categoria === 'vence_hoje') {
      return { tier: 2, subScore: 0 };
    }
    // 3. Vence em até 2 dias úteis
    if (situacaoPrazo.categoria === 'atencao' && situacaoPrazo.diasUteisRestantes !== null) {
      return { tier: 3, subScore: situacaoPrazo.diasUteisRestantes };
    }
    // 4. Prioridade Urgente
    if (pedido.prioridade_producao === 'Urgente') {
      return { tier: 4, subScore: 0 };
    }
    // 5. Prioridade Alta
    if (pedido.prioridade_producao === 'Alta') {
      return { tier: 5, subScore: 0 };
    }
    // 6. Em produção
    if (categoriaOperacional === 'em_producao') {
      return { tier: 6, subScore: 0 };
    }
    // 7. Aguardando produção
    if (categoriaOperacional === 'aguardando_producao') {
      return { tier: 7, subScore: 0 };
    }
    // 8. Prontos para envio
    if (categoriaOperacional === 'pronto_envio') {
      return { tier: 8, subScore: 0 };
    }
  }

  // 9. Demais (Transporte, Entregue, Cancelado)
  return { tier: 9, subScore: 0 };
}

/**
 * Ordena a fila de produção inteligente aplicando a cascata de prioridades.
 */
export function ordenarFilaProducao(
  pedidos: (Partial<Orcamento> & Record<string, any>)[],
  dataHoje: Date = new Date()
): (Partial<Orcamento> & Record<string, any>)[] {
  return [...pedidos].sort((a, b) => {
    const sitA = avaliarSituacaoPrazo(a, dataHoje);
    const sitB = avaliarSituacaoPrazo(b, dataHoje);
    const catA = classificarPedidoProducao(a);
    const catB = classificarPedidoProducao(b);

    const scoreA = calcularTierOrdenacao(a, sitA, catA);
    const scoreB = calcularTierOrdenacao(b, sitB, catB);

    // 1º Nível: Tier de Prioridade
    if (scoreA.tier !== scoreB.tier) {
      return scoreA.tier - scoreB.tier;
    }

    // 2º Nível: subScore (dias úteis restantes: menor/mais negativo primeiro)
    if (scoreA.subScore !== scoreB.subScore) {
      return scoreA.subScore - scoreB.subScore;
    }

    // 3º Nível: Prazo mais próximo (timestamp da data efetiva)
    const prazoA = sitA.isoPrazo ? new Date(sitA.isoPrazo).getTime() : Number.MAX_SAFE_INTEGER;
    const prazoB = sitB.isoPrazo ? new Date(sitB.isoPrazo).getTime() : Number.MAX_SAFE_INTEGER;
    if (prazoA !== prazoB) {
      return prazoA - prazoB;
    }

    // 4º Nível: Data de criação (FIFO: mais antigo primeiro para não esquecer pedidos no fim da fila)
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateA - dateB;
  });
}
