-- Migration: policies_e_rpc_interesses.sql

GRANT SELECT ON public.interesses_modelos TO authenticated;
GRANT UPDATE ON public.interesses_modelos TO authenticated; 

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interesses_modelos' AND policyname = 'Admin e Comercial podem ler interesses'
    ) THEN
        CREATE POLICY "Admin e Comercial podem ler interesses"
        ON public.interesses_modelos FOR SELECT TO authenticated
        USING (public.usuario_app_autorizado(ARRAY['administrador', 'comercial']));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interesses_modelos' AND policyname = 'Admins podem atualizar interesses'
    ) THEN
        CREATE POLICY "Admins podem atualizar interesses"
        ON public.interesses_modelos FOR UPDATE TO authenticated
        USING (public.usuario_app_autorizado(ARRAY['administrador']))
        WITH CHECK (public.usuario_app_autorizado(ARRAY['administrador']));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.atualizar_interesse_comercial(
    p_interesse_id uuid,
    p_status text,
    p_observacao_interna text
)
RETURNS public.interesses_modelos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_registro public.interesses_modelos;
BEGIN
    IF NOT public.usuario_app_autorizado(ARRAY['administrador', 'comercial']) THEN
        RAISE EXCEPTION 'Acesso negado: Usuário inativo ou não autorizado.';
    END IF;

    IF p_status IS NULL OR p_status NOT IN ('novo', 'contatado', 'em_validacao', 'aguardando_lancamento', 'convertido', 'sem_interesse') THEN
        RAISE EXCEPTION 'Status inválido: %', p_status;
    END IF;

    UPDATE public.interesses_modelos
    SET 
        status = p_status,
        observacao_interna = p_observacao_interna,
        updated_at = now()
    WHERE id = p_interesse_id
    RETURNING * INTO v_registro;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro não encontrado ou você não tem permissão para acessá-lo.';
    END IF;

    RETURN v_registro;
END;
$$;

COMMENT ON FUNCTION public.atualizar_interesse_comercial IS 'Atualização controlada de interesses permitida para Admin/Comercial.';

REVOKE ALL ON FUNCTION public.atualizar_interesse_comercial(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_interesse_comercial(uuid, text, text) TO authenticated;
