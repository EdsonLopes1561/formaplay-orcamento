-- Migration: add_rbac_usuarios.sql

CREATE TABLE IF NOT EXISTS public.usuarios_app (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome text NOT NULL,
    email text NOT NULL,
    perfil text NOT NULL,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT chk_usuarios_app_perfil CHECK (perfil IN ('administrador', 'comercial', 'producao'))
);

COMMENT ON TABLE public.usuarios_app IS 'Perfis de acesso e controle RBAC dos usuários do sistema.';

DROP TRIGGER IF EXISTS trg_usuarios_app_updated_at ON public.usuarios_app;
CREATE TRIGGER trg_usuarios_app_updated_at
  BEFORE UPDATE ON public.usuarios_app
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.usuarios_app ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.usuarios_app FROM PUBLIC, anon;
GRANT SELECT ON public.usuarios_app TO authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usuarios_app' AND policyname = 'Usuarios podem ler seu proprio perfil'
    ) THEN
        CREATE POLICY "Usuarios podem ler seu proprio perfil"
        ON public.usuarios_app
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.usuario_app_autorizado(perfis text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    usuario_valido boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios_app
        WHERE user_id = auth.uid()
          AND ativo = true
          AND (perfis IS NULL OR perfil = ANY(perfis))
    ) INTO usuario_valido;
    
    RETURN coalesce(usuario_valido, false);
END;
$$;

COMMENT ON FUNCTION public.usuario_app_autorizado IS 'Verifica de forma segura se o usuário atual está ativo e pertence aos perfis informados.';

REVOKE ALL ON FUNCTION public.usuario_app_autorizado(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_app_autorizado(text[]) TO authenticated;
