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

/**
 * Retorna o cabeçalho dinâmico e a mensagem contextual da fase para a página pública.
 */
export function getMensagemDestaqueFase(
  etapa: EtapaPublica, 
  produto?: string,
  statusInterno?: string | null
): {
  titulo: string;
  subtitulo: string;
  destaque: string;
  statusDescricao: string;
} {
  const nomeProduto = produto?.trim() || "pedido";

  switch (etapa) {
    case "Orçamento criado":
      return {
        titulo: "Acompanhamento do Orçamento",
        subtitulo: "FormaPlay — Jogos Educacionais",
        destaque: "Seu orçamento foi criado e já está disponível para acompanhamento.",
        statusDescricao: produto ? `Seu orçamento para o ${nomeProduto} foi criado.` : "Seu orçamento foi criado."
      };

    case "Aguardando confirmação":
      return {
        titulo: "Acompanhamento do Orçamento",
        subtitulo: "FormaPlay — Jogos Educacionais",
        destaque: "Seu orçamento foi enviado e está aguardando sua confirmação.",
        statusDescricao: produto ? `Aguardando sua confirmação para o ${nomeProduto}.` : "Aguardando sua confirmação."
      };

    case "Produção": {
      const sInterno = (statusInterno || '').trim().toLowerCase();
      const isApenasAutorizado = 
        sInterno.includes("autorizado para produção") || 
        sInterno.includes("autorizado para producao") ||
        sInterno.includes("autorização aprovado") ||
        sInterno.includes("autorizacao aprovado");

      if (isApenasAutorizado) {
        return {
          titulo: "Acompanhamento do Pedido",
          subtitulo: "FormaPlay — Jogos Educacionais",
          destaque: "Seu pedido foi confirmado e está aguardando o início da produção.",
          statusDescricao: produto 
            ? `Seu pedido para o ${nomeProduto} foi confirmado e está aguardando o início da produção.` 
            : "Seu pedido foi confirmado e está aguardando o início da produção."
        };
      }

      return {
        titulo: "Acompanhamento do Pedido",
        subtitulo: "FormaPlay — Jogos Educacionais",
        destaque: "Estamos preparando seu jogo.",
        statusDescricao: produto ? `Estamos preparando seu ${nomeProduto}.` : "Estamos preparando seu pedido."
      };
    }

    case "Transporte":
      return {
        titulo: "Acompanhamento do Pedido",
        subtitulo: "FormaPlay — Jogos Educacionais",
        destaque: "Seu pedido foi despachado e está a caminho.",
        statusDescricao: produto ? `Seu ${nomeProduto} está a caminho.` : "Seu pedido está a caminho."
      };

    case "Entregue":
      return {
        titulo: "Acompanhamento do Pedido",
        subtitulo: "FormaPlay — Jogos Educacionais",
        destaque: "Seu pedido foi entregue.",
        statusDescricao: produto ? `Seu ${nomeProduto} foi entregue com sucesso!` : "Seu pedido foi entregue com sucesso!"
      };

    case "Cancelado":
    default:
      return {
        titulo: "Acompanhamento",
        subtitulo: "FormaPlay — Jogos Educacionais",
        destaque: "Este orçamento/pedido foi cancelado.",
        statusDescricao: "Este registro foi cancelado e não receberá novas atualizações."
      };
  }
}

/**
 * Itens oficiais da linha de produção/fabricação dos jogos FormaPlay.
 * Utilizado para mensurar o total de etapas do checklist de produção.
 */
export const CHECKLIST_PRODUCAO_PADRAO = [
  { id: 'caixa_tampa', label: 'Caixa tampa' },
  { id: 'caixa_fundo', label: 'Caixa fundo' },
  { id: 'tabuleiro', label: 'Tabuleiro' },
  { id: 'cartas_custos', label: 'Cartas CUSTOS' },
  { id: 'cartas_imprevistos', label: 'Cartas IMPREVISTOS' },
  { id: 'cartas_desafio', label: 'Cartas DESAFIO' },
  { id: 'cartas_eventos', label: 'Cartas EVENTOS' },
  { id: 'cartas_super_virada', label: 'Cartas SUPER VIRADA' },
  { id: 'dinheiro_jogo', label: 'Dinheiro do jogo' },
  { id: 'peoes_caminhoes', label: 'Peões caminhões' },
  { id: 'dado', label: 'Dado' },
  { id: 'manual', label: 'Manual / instruções' },
  { id: 'conferencia_quantidade', label: 'Conferência de quantidade' },
  { id: 'conferencia_visual', label: 'Conferência visual' },
  { id: 'embalagem_final', label: 'Embalagem final' },
  { id: 'nf_conferida', label: 'Nota fiscal conferida' },
  { id: 'pronto_envio', label: 'Pedido pronto para envio' }
] as const;

export const TOTAL_ETAPAS_PRODUCAO = CHECKLIST_PRODUCAO_PADRAO.length;

/**
 * Gera texto descritivo e factual para o histórico quando não houver observação pública manual.
 * Mantém mensagens curtas e sem inventar dados.
 */
export function getTextoAmigavelHistorico(statusInterno?: string | null): string {
  if (!statusInterno) return "Registro de atualização do status.";
  const s = statusInterno.trim().toLowerCase();

  if (s.includes("cancelado")) return "Orçamento/pedido cancelado.";
  if (s.includes("orçamento criado") || s.includes("orcamento criado")) return "O orçamento foi criado no sistema.";
  if (s.includes("solicitação recebida") || s.includes("solicitacao recebida")) return "Solicitação recebida e registrada.";
  if (s.includes("orçamento enviado") || s.includes("orcamento enviado")) return "Seu orçamento foi encaminhado para confirmação.";
  if (s.includes("aguardando confirmação do cliente") || s.includes("aguardando confirmacao do cliente")) return "Aguardando confirmação do cliente.";
  if (s.includes("aguardando confirmação") || s.includes("aguardando confirmacao")) return "Aguardando confirmação comercial.";
  if (s.includes("aguardando pagamento") || s.includes("autorização de compra") || s.includes("autorizacao de compra")) return "Aguardando pagamento ou autorização formal de compra.";
  if (s.includes("autorizado para produção") || s.includes("autorizado para producao")) return "Pedido autorizado para início da produção.";
  if (s.includes("em produção") || s.includes("em producao") || s === "produção" || s === "producao") return "Produção iniciada.";
  if (s.includes("nota fiscal emitida") || s.includes("nf emitida")) return "A nota fiscal foi emitida.";
  if (s.includes("fase de entrega") || s.includes("em trânsito") || s.includes("em transito") || s.includes("despachado") || s === "transporte") return "Pedido despachado para transporte.";
  if (s.includes("entregue") || s.includes("concluído") || s.includes("concluido")) return "Pedido entregue com sucesso.";

  return `Status atualizado para: ${statusInterno}.`;
}

