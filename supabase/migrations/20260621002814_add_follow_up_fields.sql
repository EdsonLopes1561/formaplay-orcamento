ALTER TABLE public.orcamentos 
ADD COLUMN IF NOT EXISTS proxima_acao text DEFAULT '',
ADD COLUMN IF NOT EXISTS data_retorno date,
ADD COLUMN IF NOT EXISTS observacao_interna text DEFAULT '',
ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'Baixa' CHECK (prioridade IN ('Baixa', 'Média', 'Alta'));
