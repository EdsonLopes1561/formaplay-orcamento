/**
 * Lista de etapas detalhadas para uso INTERNO (painel administrativo, histórico no banco e editor).
 */
export const ETAPAS_TIMELINE_INTERNA = [
  "Orçamento criado",
  "Solicitação recebida",
  "Orçamento enviado",
  "Aguardando confirmação",
  "Aguardando confirmação do cliente",
  "Aguardando pagamento/autorização de compra",
  "Pedido autorizado para produção",
  "Pedido em produção",
  "Produção",
  "Nota fiscal emitida",
  "Pedido em fase de entrega",
  "Transporte",
  "Pedido entregue",
  "Entregue",
  "Cancelado"
];

// Compatibilidade retroativa para componentes legados
export const ETAPAS_TIMELINE = ETAPAS_TIMELINE_INTERNA;

/**
 * Lista das 5 etapas normalizadas para a visualização PÚBLICA do cliente.
 */
export const ETAPAS_TIMELINE_PUBLICA = [
  "Orçamento criado",
  "Aguardando confirmação",
  "Produção",
  "Transporte",
  "Entregue"
] as const;

export type EtapaPublica = typeof ETAPAS_TIMELINE_PUBLICA[number] | "Cancelado";

/**
 * Mapeia qualquer status interno para uma das 5 etapas públicas da timeline.
 */
export function mapearStatusParaPublico(status?: string | null): EtapaPublica {
  if (!status) return "Orçamento criado";
  const s = status.trim().toLowerCase();

  if (s === "cancelado") return "Cancelado";

  // 1. Orçamento criado
  if (
    s === "orçamento criado" || 
    s === "orcamento criado" ||
    s.includes("solicitação recebida") || 
    s.includes("solicitacao recebida")
  ) {
    return "Orçamento criado";
  }

  // 2. Aguardando confirmação
  if (
    s === "aguardando confirmação" ||
    s === "aguardando confirmacao" ||
    s.includes("orçamento enviado") ||
    s.includes("orcamento enviado") ||
    s.includes("aguardando confirmação do cliente") ||
    s.includes("aguardando confirmacao do cliente") ||
    s.includes("aguardando pagamento") ||
    s.includes("autorização de compra") ||
    s.includes("autorizacao de compra")
  ) {
    return "Aguardando confirmação";
  }

  // 3. Produção
  if (
    s === "produção" ||
    s === "producao" ||
    s.includes("autorizado para produção") ||
    s.includes("autorizado para producao") ||
    s.includes("em produção") ||
    s.includes("em producao") ||
    s.includes("nota fiscal emitida") ||
    s.includes("nf emitida") ||
    s.includes("autorização aprovado") ||
    s.includes("autorizacao aprovado")
  ) {
    return "Produção";
  }

  // 4. Transporte
  if (
    s === "transporte" ||
    s.includes("fase de entrega") ||
    s.includes("em trânsito") ||
    s.includes("em transito") ||
    s.includes("despachado")
  ) {
    return "Transporte";
  }

  // 5. Entregue
  if (
    s === "entregue" ||
    s.includes("entregue") ||
    s.includes("concluído") ||
    s.includes("concluido") ||
    s.includes("finalizado")
  ) {
    return "Entregue";
  }

  return "Orçamento criado";
}

/**
 * Retorna se o status representa a fase inicial de orçamento (não confirmado) ou fase de pedido/produção.
 */
export function isFaseOrcamento(status?: string | null): boolean {
  const etapa = mapearStatusParaPublico(status);
  return etapa === "Orçamento criado" || etapa === "Aguardando confirmação";
}
