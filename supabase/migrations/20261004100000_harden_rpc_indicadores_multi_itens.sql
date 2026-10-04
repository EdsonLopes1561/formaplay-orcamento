-- Migration: Blindagem da RPC de indicadores públicos de tração com suporte a orçamentos multi-itens e legados
-- Arquivo: supabase/migrations/20261004100000_harden_rpc_indicadores_multi_itens.sql
-- Regra de unidadesVendidas:
--   A) Se itens for array não vazio com soma válida > 0 -> usa a soma dos itens (com proteção estrita de tipo no jsonb_array_length)
--   B) Se itens for null, vazio, não-array ou sem itens válidos -> usa a coluna quantidade (se > 0)
--   C) Se nenhuma fonte for válida -> usa 0 (sem fallback arbitrário)

CREATE OR REPLACE FUNCTION public.get_public_indicadores_tracao()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unidades integer;
  v_vendas integer;
  v_cidades integer;
BEGIN
  -- 1. Unidades comercializadas: soma inteligente e estrita (itens > quantidade > 0)
  SELECT COALESCE(SUM(
    COALESCE(
      -- A) Se itens é array não vazio com soma válida > 0, usa a soma dos itens (com proteção de tipo)
      CASE
        WHEN jsonb_typeof(o.itens) = 'array' THEN
          CASE
            WHEN jsonb_array_length(o.itens) > 0 THEN
              (
                SELECT NULLIF(COALESCE(SUM(
                  CASE
                    WHEN (elem->>'quantidade') ~ '^[0-9]+$' AND (elem->>'quantidade')::integer > 0
                      THEN (elem->>'quantidade')::integer
                    ELSE 0
                  END
                ), 0), 0)
                FROM jsonb_array_elements(o.itens) AS elem
              )
            ELSE NULL
          END
        ELSE NULL
      END,
      -- B) Se itens for null, vazio, não-array ou sem itens válidos, usa a coluna quantidade se for inteira e > 0
      CASE
        WHEN o.quantidade IS NOT NULL 
             AND (o.quantidade::text) ~ '^[0-9]+$' 
             AND (o.quantidade::integer) > 0 
          THEN o.quantidade::integer
        ELSE NULL
      END,
      -- C) Se nenhuma fonte tiver quantidade válida, usa 0
      0
    )
  ), 0)
  INTO v_unidades
  FROM public.orcamentos o
  WHERE o.status = 'Aprovado';

  -- 2. Vendas realizadas: total de pedidos confirmados
  SELECT COUNT(*)
  INTO v_vendas
  FROM public.orcamentos
  WHERE status = 'Aprovado';

  -- 3. Cidades com vendas: contagem de cidades reais distintas dos pedidos aprovados
  SELECT COUNT(DISTINCT (
    CASE
      WHEN cliente_cidade IS NOT NULL 
           AND TRIM(cliente_cidade) != '' 
           AND LOWER(TRIM(cliente_cidade)) != 'null' 
        THEN LOWER(TRIM(cliente_cidade))
      WHEN cidade IS NOT NULL 
           AND TRIM(cidade) != '' 
           AND LOWER(TRIM(cidade)) != 'null' 
        THEN LOWER(TRIM(
          REGEXP_REPLACE(
            REPLACE(cidade, '´', ''''),
            '/.*$', 
            ''
          )
        ))
      ELSE NULL
    END
  ))
  INTO v_cidades
  FROM public.orcamentos
  WHERE status = 'Aprovado'
    AND (
      (cliente_cidade IS NOT NULL AND TRIM(cliente_cidade) != '' AND LOWER(TRIM(cliente_cidade)) != 'null')
      OR
      (cidade IS NOT NULL AND TRIM(cidade) != '' AND LOWER(TRIM(cidade)) != 'null')
    );

  RETURN json_build_object(
    'unidadesVendidas', v_unidades,
    'vendasRealizadas', v_vendas,
    'cidadesComVendas', COALESCE(v_cidades, 0)
  );
END;
$$;

-- Permissões de execução
REVOKE ALL ON FUNCTION public.get_public_indicadores_tracao() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_indicadores_tracao() TO anon, authenticated, service_role;
