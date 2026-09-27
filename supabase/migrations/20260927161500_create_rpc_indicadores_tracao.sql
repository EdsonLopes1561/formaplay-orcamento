-- Migration: Criar/Atualizar RPC segura para indicadores públicos de tração da FormaPlay
-- Retorna exclusivamente os agregados: unidadesVendidas, vendasRealizadas, cidadesComVendas.
-- RLS da tabela orcamentos permanece intacto e nenhum dado sensível/individual é exposto.

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
  -- 1. Unidades comercializadas: soma da quantidade dos pedidos aprovados
  SELECT COALESCE(SUM(quantidade::integer), 0)
  INTO v_unidades
  FROM public.orcamentos
  WHERE status = 'Aprovado';

  -- 2. Vendas realizadas: total de pedidos confirmados
  SELECT COUNT(*)
  INTO v_vendas
  FROM public.orcamentos
  WHERE status = 'Aprovado';

  -- 3. Cidades com vendas: contagem de cidades reais distintas dos pedidos aprovados
  -- Regra: Prioriza cliente_cidade; se ausente, utiliza cidade removendo sufixo /UF.
  -- Ignora valores nulos, vazios ou strings literais 'null' / 'desconhecido'.
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
