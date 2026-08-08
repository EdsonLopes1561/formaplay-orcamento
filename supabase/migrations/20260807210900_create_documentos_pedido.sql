-- Migration: create_documentos_pedido.sql

-- 1. Criação da tabela
CREATE TABLE IF NOT EXISTS public.documentos_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL,
  titulo text NOT NULL,
  nome_arquivo text NOT NULL,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  numero_documento text,
  data_documento date,
  visivel_cliente boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id),
  
  CONSTRAINT chk_tipo_documento CHECK (
    tipo_documento IN ('orcamento', 'nfe_pdf', 'nfe_xml', 'boleto', 'comprovante_envio', 'outro')
  ),
  CONSTRAINT uq_storage_path UNIQUE(storage_path)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_documentos_pedido_orcamento_id ON public.documentos_pedido(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_documentos_pedido_visibilidade ON public.documentos_pedido(orcamento_id, visivel_cliente);
CREATE INDEX IF NOT EXISTS idx_documentos_pedido_created_at ON public.documentos_pedido(created_at);

-- 3. Trigger de updated_at (A função public.set_updated_at() já existe no banco)
DROP TRIGGER IF EXISTS trg_documentos_pedido_updated_at ON public.documentos_pedido;
CREATE TRIGGER trg_documentos_pedido_updated_at
  BEFORE UPDATE ON public.documentos_pedido
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Habilitar RLS e criar políticas na tabela
ALTER TABLE public.documentos_pedido ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documentos_pedido FROM PUBLIC, anon;

-- Permissões básicas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_pedido TO authenticated;

-- Policy de SELECT: Admin, Comercial, Produção
CREATE POLICY "Leitura de documentos permitida para staff"
ON public.documentos_pedido FOR SELECT TO authenticated
USING (public.usuario_app_autorizado(ARRAY['administrador', 'comercial', 'producao']));

-- Policy de INSERT: Admin, Comercial, Produção (para comprovantes). Garante autoria.
CREATE POLICY "Inserção de documentos permitida para staff"
ON public.documentos_pedido FOR INSERT TO authenticated
WITH CHECK (
  public.usuario_app_autorizado(ARRAY['administrador', 'comercial', 'producao'])
  AND created_by = auth.uid()
);

-- Policy de UPDATE: Admin e Comercial
CREATE POLICY "Atualização de documentos permitida para Admin e Comercial"
ON public.documentos_pedido FOR UPDATE TO authenticated
USING (public.usuario_app_autorizado(ARRAY['administrador', 'comercial']))
WITH CHECK (public.usuario_app_autorizado(ARRAY['administrador', 'comercial']));

-- Policy de DELETE: Admin e Comercial
CREATE POLICY "Exclusão de documentos permitida para Admin e Comercial"
ON public.documentos_pedido FOR DELETE TO authenticated
USING (public.usuario_app_autorizado(ARRAY['administrador', 'comercial']));

-- 5. RPC para consulta pública segura
CREATE OR REPLACE FUNCTION public.buscar_documentos_publicos(p_token text)
RETURNS TABLE (
    id uuid,
    tipo_documento text,
    titulo text,
    nome_arquivo text,
    mime_type text,
    tamanho_bytes bigint,
    numero_documento text,
    data_documento date,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_orcamento_id uuid;
BEGIN
    -- Localiza o orcamento pelo token
    SELECT o.id INTO v_orcamento_id
    FROM public.orcamentos o
    WHERE o.token_publico = p_token
    LIMIT 1;
    
    IF v_orcamento_id IS NULL THEN
        RETURN; -- Retorna vazio se token não encontrado
    END IF;

    -- Retorna apenas os campos seguros dos documentos visíveis deste orçamento
    RETURN QUERY
    SELECT 
        d.id,
        d.tipo_documento,
        d.titulo,
        d.nome_arquivo,
        d.mime_type,
        d.tamanho_bytes,
        d.numero_documento,
        d.data_documento,
        d.created_at
    FROM public.documentos_pedido d
    WHERE d.orcamento_id = v_orcamento_id
      AND d.visivel_cliente = true
    ORDER BY d.created_at DESC;
END;
$$;

-- Permissões explícitas da RPC pública
REVOKE ALL ON FUNCTION public.buscar_documentos_publicos(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buscar_documentos_publicos(text) TO anon, authenticated;


-- 6. Criação do Bucket de Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-pedidos',
  'documentos-pedidos',
  false,
  10485760, -- 10MB em bytes
  ARRAY['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/png'];

-- 7. Storage Policies
-- SELECT
CREATE POLICY "Leitura do storage para staff"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos-pedidos' AND public.usuario_app_autorizado(ARRAY['administrador', 'comercial', 'producao']));

-- INSERT
CREATE POLICY "Inserção no storage para staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-pedidos' AND public.usuario_app_autorizado(ARRAY['administrador', 'comercial', 'producao']));

-- UPDATE
CREATE POLICY "Atualização no storage para Admin e Comercial"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos-pedidos' AND public.usuario_app_autorizado(ARRAY['administrador', 'comercial']));

-- DELETE
CREATE POLICY "Exclusão no storage para Admin e Comercial"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos-pedidos' AND public.usuario_app_autorizado(ARRAY['administrador', 'comercial']));
