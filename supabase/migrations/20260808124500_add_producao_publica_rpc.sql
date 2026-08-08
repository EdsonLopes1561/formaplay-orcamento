-- Migration: Adicionar progresso de produção na RPC de acompanhamento público
-- Arquivo: supabase/migrations/20260808124500_add_producao_publica_rpc.sql

DROP FUNCTION IF EXISTS public.buscar_acompanhamento_pedido(text);

CREATE OR REPLACE FUNCTION buscar_acompanhamento_pedido(p_token text)
RETURNS TABLE (
  numero text,
  cliente_nome_publico text,
  produto text,
  quantidade numeric,
  status_acompanhamento text,
  status_atualizado_em timestamp with time zone,
  observacao_publica_status text,
  nf_emitida boolean,
  nf_numero text,
  nf_emitida_em date,
  nf_pdf_url text,
  historico_status jsonb,
  transportadora text,
  codigo_rastreio text,
  link_rastreio text,
  data_envio date,
  previsao_entrega date,
  data_entrega date,
  observacao_entrega_publica text,
  -- NOVOS CAMPOS PARA PRODUCAO (Fase de acompanhamento)
  status_producao text,
  producao_itens_concluidos int
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.numero::text,
    COALESCE(
      CASE 
        WHEN NULLIF(TRIM(o.cliente), '') IS NULL THEN 'Cliente FormaPlay'
        WHEN TRIM(o.cliente) ~ '^(\S+)\s+(\S)' THEN 
          (regexp_match(TRIM(o.cliente), '^(\S+)\s+(\S)'))[1] || ' ' || (regexp_match(TRIM(o.cliente), '^(\S+)\s+(\S)'))[2] || '.'
        ELSE split_part(TRIM(o.cliente), ' ', 1)
      END,
      'Cliente FormaPlay'
    )::text AS cliente_nome_publico,
    o.produto::text,
    o.quantidade::numeric,
    o.status_acompanhamento::text,
    o.status_atualizado_em::timestamp with time zone,
    o.observacao_publica_status::text,
    COALESCE(o.nf_emitida, false)::boolean,
    o.nf_numero::text,
    o.nf_emitida_em::date,
    o.nf_pdf_url::text,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'status', h.status,
            'data_status', h.data_status,
            'observacao_publica', h.observacao_publica
          ) ORDER BY h.data_status ASC
        )
        FROM public.orcamento_status_historico h
        WHERE h.orcamento_id = o.id
      ),
      '[]'::jsonb
    ) AS historico_status,
    o.transportadora::text,
    o.codigo_rastreio::text,
    o.link_rastreio::text,
    o.data_envio::date,
    o.previsao_entrega::date,
    o.data_entrega::date,
    o.observacao_entrega_publica::text,
    -- MAPEAR OS NOVOS CAMPOS:
    o.status_producao::text,
    jsonb_array_length(COALESCE(o.producao_checklist, '[]'::jsonb))::int AS producao_itens_concluidos
  FROM orcamentos o
  WHERE o.token_publico = p_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION buscar_acompanhamento_pedido(text) TO anon, authenticated;
