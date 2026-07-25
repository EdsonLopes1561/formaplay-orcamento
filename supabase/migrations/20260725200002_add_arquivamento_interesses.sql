-- Migration: 20260725200002_add_arquivamento_interesses.sql

-- 1. Adicionar colunas de arquivamento (Soft Delete) com Restrições
ALTER TABLE public.interesses_modelos
ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS arquivado_em timestamptz NULL,
ADD COLUMN IF NOT EXISTS arquivado_por uuid NULL 
    REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS motivo_arquivamento text NULL;

-- Adicionar Constraint de tamanho para o motivo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t
          ON c.conrelid = t.oid
        JOIN pg_namespace n
          ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'interesses_modelos'
          AND c.conname = 'chk_interesses_modelos_motivo_arquivamento_tamanho'
    ) THEN
        ALTER TABLE public.interesses_modelos
        ADD CONSTRAINT chk_interesses_modelos_motivo_arquivamento_tamanho
        CHECK (
            char_length(motivo_arquivamento) <= 500
        );
    END IF;
END
$$;

-- 2. Índice para otimizar a listagem
CREATE INDEX IF NOT EXISTS idx_interesses_modelos_arquivado_created_at
ON public.interesses_modelos (arquivado, created_at DESC);

-- 3. RPC para Arquivar/Restaurar (Admin e Comercial)
CREATE OR REPLACE FUNCTION public.arquivar_interesse(
    p_interesse_id uuid,
    p_arquivar boolean,
    p_motivo text DEFAULT NULL
)
RETURNS public.interesses_modelos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_registro public.interesses_modelos;
    v_motivo text;
BEGIN
    -- Validar operação
    IF p_arquivar IS NULL THEN
        RAISE EXCEPTION 'A operação de arquivamento deve ser informada.';
    END IF;

    -- Validar autorização
    IF NOT public.usuario_app_autorizado(ARRAY['administrador', 'comercial']) THEN
        RAISE EXCEPTION 'Acesso negado: Usuário inativo ou não autorizado.';
    END IF;

    -- Normalizar motivo
    v_motivo := NULLIF(left(btrim(p_motivo), 500), '');

    IF p_arquivar THEN
        UPDATE public.interesses_modelos
        SET 
            arquivado = true,
            arquivado_em = now(),
            arquivado_por = auth.uid(),
            motivo_arquivamento = v_motivo,
            updated_at = now()
        WHERE id = p_interesse_id
        RETURNING * INTO v_registro;
    ELSE
        UPDATE public.interesses_modelos
        SET 
            arquivado = false,
            arquivado_em = NULL,
            arquivado_por = NULL,
            motivo_arquivamento = NULL,
            updated_at = now()
        WHERE id = p_interesse_id
        RETURNING * INTO v_registro;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro não encontrado ou você não tem permissão para acessá-lo.';
    END IF;

    RETURN v_registro;
END;
$$;

COMMENT ON FUNCTION public.arquivar_interesse(uuid, boolean, text) 
IS 'Arquiva ou restaura um interesse. Acessível por administrador e comercial.';

REVOKE ALL ON FUNCTION public.arquivar_interesse(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arquivar_interesse(uuid, boolean, text) TO authenticated;

-- 4. RPC para Exclusão Definitiva (Apenas Admin)
CREATE OR REPLACE FUNCTION public.excluir_interesse_definitivamente(
    p_interesse_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_id_excluido uuid;
BEGIN
    -- Validar autorização ESTRITA
    IF NOT public.usuario_app_autorizado(ARRAY['administrador']) THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem excluir registros definitivamente.';
    END IF;

    -- Exclusão atômica focada
    DELETE FROM public.interesses_modelos
    WHERE id = p_interesse_id
      AND arquivado = true
    RETURNING id INTO v_id_excluido;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro não encontrado ou ainda não está arquivado.';
    END IF;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.excluir_interesse_definitivamente(uuid) 
IS 'Exclusão permanente de um interesse arquivado. Apenas administrador.';

REVOKE ALL ON FUNCTION public.excluir_interesse_definitivamente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_interesse_definitivamente(uuid) TO authenticated;
