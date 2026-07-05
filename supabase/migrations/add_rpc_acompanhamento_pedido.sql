-- Migration: Adicionar função segura para consultar acompanhamento público
-- Arquivo: supabase/migrations/add_rpc_acompanhamento_pedido.sql

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
  nf_pdf_url text
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
    o.nf_pdf_url::text
  FROM orcamentos o
  WHERE o.token_publico = p_token
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION buscar_acompanhamento_pedido(text) TO anon, authenticated;
