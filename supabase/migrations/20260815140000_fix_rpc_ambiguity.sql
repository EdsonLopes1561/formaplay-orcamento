CREATE OR REPLACE FUNCTION public.inserir_historico_status_orcamento(
    p_orcamento_id uuid,
    p_status text,
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
DECLARE
    v_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.orcamento_status_historico h
        WHERE h.orcamento_id = p_orcamento_id
          AND h.status = TRIM(p_status)
    ) THEN
        RAISE EXCEPTION
            'A etapa % já existe para este pedido e não pode ser duplicada.',
            TRIM(p_status);
    END IF;

    INSERT INTO public.orcamento_status_historico (
        orcamento_id,
        status,
        data_status,
        observacao_publica
    )
    VALUES (
        p_orcamento_id,
        TRIM(p_status),
        COALESCE(p_data_status, now()),
        p_observacao_publica
    )
    ON CONFLICT DO NOTHING
    RETURNING public.orcamento_status_historico.id INTO v_id;

    IF v_id IS NULL THEN
        RAISE EXCEPTION
            'A etapa % já existe para este pedido e não pode ser duplicada.',
            TRIM(p_status);
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
    WHERE h.id = v_id;
END;
$$;
