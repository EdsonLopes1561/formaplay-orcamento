-- FormaPlay Orçamento — Preparação para múltiplos itens por orçamento
-- Este SQL apenas adiciona a coluna "itens" em JSONB.
-- Não remove colunas antigas.
-- Não altera RLS.
-- Não altera políticas.
-- Não altera dados existentes.

ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS itens jsonb;

ALTER TABLE public.solicitacoes_orcamento
ADD COLUMN IF NOT EXISTS itens jsonb;
