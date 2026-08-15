-- 1. Cria a restrição UNIQUE para evitar duplicidades estruturais
CREATE UNIQUE INDEX IF NOT EXISTS uq_orcamento_status_historico_orcamento_status
ON public.orcamento_status_historico (orcamento_id, status);

-- 2. Criação do RPC para o Editor de Linha do Tempo (Inserir retroativamente)
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

    -- Verificação amigável antes de inserir
    IF EXISTS (
        SELECT 1 
        FROM public.orcamento_status_historico 
        WHERE orcamento_id = p_orcamento_id 
          AND status = TRIM(p_status)
    ) THEN
        RAISE EXCEPTION 'A etapa % já existe para este pedido e não pode ser duplicada.', TRIM(p_status);
    END IF;

    -- Insere a nova etapa com proteção contra concorrência
    INSERT INTO public.orcamento_status_historico (
        orcamento_id,
        status,
        data_status,
        observacao_publica
    ) VALUES (
        p_orcamento_id,
        TRIM(p_status),
        COALESCE(p_data_status, now()),
        p_observacao_publica
    ) 
    ON CONFLICT (orcamento_id, status) DO NOTHING
    RETURNING orcamento_status_historico.id INTO v_id;

    -- Se ON CONFLICT agiu por concorrência, v_id será NULL
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'A etapa % já existe para este pedido e não pode ser duplicada.', TRIM(p_status);
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

-- Permissões para a nova função com schema explícito
REVOKE ALL ON FUNCTION public.inserir_historico_status_orcamento(uuid, text, timestamp with time zone, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.inserir_historico_status_orcamento(uuid, text, timestamp with time zone, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.inserir_historico_status_orcamento(uuid, text, timestamp with time zone, text) TO authenticated;

-- 3. Atualizar a Trigger para evitar cópia indevida da observação e prevenir duplicidade
CREATE OR REPLACE FUNCTION public.registrar_historico_status_orcamento()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verifica se a operação é um INSERT
    IF TG_OP = 'INSERT' THEN
        IF NULLIF(TRIM(NEW.status_acompanhamento), '') IS NOT NULL THEN
            INSERT INTO public.orcamento_status_historico (
                orcamento_id,
                status,
                data_status,
                observacao_publica
            ) VALUES (
                NEW.id,
                TRIM(NEW.status_acompanhamento),
                COALESCE(NEW.status_atualizado_em, now()),
                NULL -- NÃO copiar NEW.observacao_publica_status
            )
            ON CONFLICT (orcamento_id, status) DO NOTHING;
        END IF;
        
    -- Verifica se a operação é um UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status_acompanhamento IS DISTINCT FROM NEW.status_acompanhamento 
           AND NULLIF(TRIM(NEW.status_acompanhamento), '') IS NOT NULL THEN
            
            INSERT INTO public.orcamento_status_historico (
                orcamento_id,
                status,
                data_status,
                observacao_publica
            ) VALUES (
                NEW.id,
                TRIM(NEW.status_acompanhamento),
                COALESCE(NEW.status_atualizado_em, now()),
                NULL -- NÃO copiar NEW.observacao_publica_status
            )
            ON CONFLICT (orcamento_id, status) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
