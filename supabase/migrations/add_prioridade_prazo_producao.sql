ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS prioridade_producao text DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS prazo_producao date,
ADD COLUMN IF NOT EXISTS observacao_prioridade text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orcamentos_prioridade_producao_check'
  ) THEN
    ALTER TABLE public.orcamentos
    ADD CONSTRAINT orcamentos_prioridade_producao_check
    CHECK (prioridade_producao IN ('Normal', 'Alta', 'Urgente'));
  END IF;
END $$;
