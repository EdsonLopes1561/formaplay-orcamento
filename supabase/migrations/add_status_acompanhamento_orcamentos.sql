-- Adiciona colunas para acompanhamento público do pedido
ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS token_publico text,
ADD COLUMN IF NOT EXISTS status_acompanhamento text,
ADD COLUMN IF NOT EXISTS status_atualizado_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS observacao_publica_status text,
ADD COLUMN IF NOT EXISTS nf_emitida boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS nf_numero text,
ADD COLUMN IF NOT EXISTS nf_emitida_em date,
ADD COLUMN IF NOT EXISTS nf_pdf_url text;

-- Cria índice único para token_publico, ignorando nulos, para buscas performáticas
CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamentos_token_publico 
ON public.orcamentos (token_publico) 
WHERE token_publico IS NOT NULL;
