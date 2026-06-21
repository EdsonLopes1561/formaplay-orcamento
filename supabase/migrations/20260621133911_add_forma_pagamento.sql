ALTER TABLE public.solicitacoes_orcamento ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT 'Pix com desconto';
