-- Migration: 20260904225000_multiupload_and_zip_support.sql
-- Atualiza restrições de tipo de documento e allowed_mime_types do storage

-- 1. Atualizar constraint de tipo_documento na tabela public.documentos_pedido
ALTER TABLE public.documentos_pedido
  DROP CONSTRAINT IF EXISTS chk_tipo_documento;

ALTER TABLE public.documentos_pedido
  ADD CONSTRAINT chk_tipo_documento CHECK (
    tipo_documento IN (
      'orcamento',
      'confirmacao_pedido',
      'nfe_pdf',
      'nfe_xml',
      'boleto',
      'comprovante_envio',
      'outro'
    )
  );

-- 2. Atualizar allowed_mime_types no bucket documentos-pedidos mantendo os formatos existentes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-pedidos',
  'documentos-pedidos',
  false,
  10485760, -- 10MB em bytes
  ARRAY[
    'application/pdf',
    'application/xml',
    'text/xml',
    'image/jpeg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/xml',
    'text/xml',
    'image/jpeg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip'
  ];
