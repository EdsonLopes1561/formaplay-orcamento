-- Ativa RLS na tabela
ALTER TABLE public.orcamento_status_historico ENABLE ROW LEVEL SECURITY;

-- Garante que anon não tenha acesso direto
REVOKE ALL ON public.orcamento_status_historico FROM anon;

-- Remove policies antigas se existirem
DROP POLICY IF EXISTS "Permitir select para authenticated" ON public.orcamento_status_historico;
DROP POLICY IF EXISTS "Permitir insert para authenticated" ON public.orcamento_status_historico;
DROP POLICY IF EXISTS "Permitir update para authenticated" ON public.orcamento_status_historico;
DROP POLICY IF EXISTS "Permitir delete para authenticated" ON public.orcamento_status_historico;

-- Cria policies apenas para authenticated
CREATE POLICY "Permitir select para authenticated"
ON public.orcamento_status_historico FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Permitir insert para authenticated"
ON public.orcamento_status_historico FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir update para authenticated"
ON public.orcamento_status_historico FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir delete para authenticated"
ON public.orcamento_status_historico FOR DELETE
TO authenticated USING (true);


-- 1. Função para listar os registros da linha do tempo de um orçamento
CREATE OR REPLACE FUNCTION listar_historico_status_orcamento(p_orcamento_id uuid)
RETURNS TABLE (
    id uuid,
    orcamento_id uuid,
    status text,
    data_status timestamp with time zone,
    observacao_publica text,
    criado_em timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    RETURN QUERY
    SELECT 
        h.id,
        h.orcamento_id,
        h.status,
        h.data_status,
        h.observacao_publica,
        h.criado_em
    FROM public.orcamento_status_historico h
    WHERE h.orcamento_id = p_orcamento_id
    ORDER BY h.data_status ASC;
END;
$$;

-- 2. Função para atualizar um registro da linha do tempo
CREATE OR REPLACE FUNCTION atualizar_historico_status_orcamento(
    p_id uuid,
    p_data_status timestamp with time zone,
    p_observacao_publica text
)
RETURNS TABLE (
    id uuid,
    orcamento_id uuid,
    status text,
    data_status timestamp with time zone,
    observacao_publica text,
    criado_em timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Atualiza apenas os campos permitidos
    UPDATE public.orcamento_status_historico h
    SET 
        data_status = COALESCE(p_data_status, h.data_status),
        observacao_publica = p_observacao_publica
    WHERE h.id = p_id;

    -- Retorna o registro atualizado
    RETURN QUERY
    SELECT 
        h.id,
        h.orcamento_id,
        h.status,
        h.data_status,
        h.observacao_publica,
        h.criado_em
    FROM public.orcamento_status_historico h
    WHERE h.id = p_id;
END;
$$;

-- 3. Função para excluir um registro da linha do tempo
CREATE OR REPLACE FUNCTION excluir_historico_status_orcamento(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    DELETE FROM public.orcamento_status_historico h
    WHERE h.id = p_id;
    
    -- Verifica se alguma linha foi afetada
    v_deleted := FOUND;
    
    RETURN v_deleted;
END;
$$;


-- Configurações de permissões para listar_historico_status_orcamento
REVOKE ALL ON FUNCTION listar_historico_status_orcamento(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION listar_historico_status_orcamento(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION listar_historico_status_orcamento(uuid) TO authenticated;

-- Configurações de permissões para atualizar_historico_status_orcamento
REVOKE ALL ON FUNCTION atualizar_historico_status_orcamento(uuid, timestamp with time zone, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION atualizar_historico_status_orcamento(uuid, timestamp with time zone, text) FROM anon;
GRANT EXECUTE ON FUNCTION atualizar_historico_status_orcamento(uuid, timestamp with time zone, text) TO authenticated;

-- Configurações de permissões para excluir_historico_status_orcamento
REVOKE ALL ON FUNCTION excluir_historico_status_orcamento(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION excluir_historico_status_orcamento(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION excluir_historico_status_orcamento(uuid) TO authenticated;
