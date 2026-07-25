CREATE TABLE IF NOT EXISTS public.interesses_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  nome text NOT NULL,
  whatsapp text,
  email text,
  cidade text,
  estado text,
  tipo_interessado text,

  modelo_interesse text NOT NULL,
  finalidade_uso text,
  quantidade_estimada integer,
  interesse_personalizacao text,
  observacoes text,

  aceita_contato boolean NOT NULL DEFAULT false,
  origem text NOT NULL DEFAULT 'site_formaplay',

  status text NOT NULL DEFAULT 'novo',
  observacao_interna text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_interesse_nome CHECK (char_length(trim(nome)) BETWEEN 2 AND 150),
  CONSTRAINT chk_interesse_contato CHECK (
      nullif(trim(coalesce(whatsapp, '')), '') IS NOT NULL OR
      nullif(trim(coalesce(email, '')), '') IS NOT NULL
  ),
  CONSTRAINT chk_interesse_tipo CHECK (
      tipo_interessado IS NULL OR
      tipo_interessado IN ('pessoa_fisica', 'professor_instrutor', 'instituicao_ensino', 'empresa', 'outro')
  ),
  CONSTRAINT chk_interesse_aceite CHECK (aceita_contato = true),
  CONSTRAINT chk_interesse_quantidade CHECK (quantidade_estimada IS NULL OR quantidade_estimada >= 1),
  CONSTRAINT chk_interesse_status CHECK (
      status IN ('novo', 'contatado', 'em_validacao', 'aguardando_lancamento', 'convertido', 'sem_interesse')
  ),
  CONSTRAINT chk_interesse_modelo CHECK (
      modelo_interesse IN ('Desafio Logístico Premium', 'Desafio Kids', 'Edição do Professor')
  ),
  CONSTRAINT chk_interesse_personalizacao CHECK (
      interesse_personalizacao IS NULL OR interesse_personalizacao IN ('sim', 'nao', 'talvez')
  ),
  CONSTRAINT chk_interesse_origem CHECK (origem = 'site_formaplay'),
  CONSTRAINT chk_interesse_tamanho_whatsapp CHECK (whatsapp IS NULL OR char_length(trim(whatsapp)) <= 30),
  CONSTRAINT chk_interesse_tamanho_email CHECK (email IS NULL OR char_length(trim(email)) <= 180),
  CONSTRAINT chk_interesse_tamanho_observacoes CHECK (observacoes IS NULL OR char_length(observacoes) <= 3000)
);

COMMENT ON TABLE public.interesses_modelos IS 'Registros de interesse nos modelos FormaPlay ainda em desenvolvimento.';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interesses_modelos_updated_at ON public.interesses_modelos;
CREATE TRIGGER trg_interesses_modelos_updated_at
  BEFORE UPDATE ON public.interesses_modelos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_interesses_modelos_created_at ON public.interesses_modelos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interesses_modelos_modelo ON public.interesses_modelos (modelo_interesse);
CREATE INDEX IF NOT EXISTS idx_interesses_modelos_status ON public.interesses_modelos (status);

ALTER TABLE public.interesses_modelos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir INSERT anonimo pelo site" ON public.interesses_modelos;
CREATE POLICY "Permitir INSERT anonimo pelo site"
ON public.interesses_modelos
FOR INSERT
TO anon
WITH CHECK (
  status = 'novo'
  AND origem = 'site_formaplay'
  AND aceita_contato = true
  AND observacao_interna IS NULL
  AND modelo_interesse IN ('Desafio Logístico Premium', 'Desafio Kids', 'Edição do Professor')
);

REVOKE ALL ON public.interesses_modelos FROM anon, authenticated;

GRANT INSERT (
  nome,
  whatsapp,
  email,
  cidade,
  estado,
  tipo_interessado,
  modelo_interesse,
  finalidade_uso,
  quantidade_estimada,
  interesse_personalizacao,
  observacoes,
  aceita_contato
)
ON public.interesses_modelos
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interesses_modelos TO service_role;
