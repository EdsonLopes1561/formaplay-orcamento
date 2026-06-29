-- Migration to add 'itens' jsonb column to public.orcamentos and public.solicitacoes_orcamento tables
-- This allows storing multiple product snapshots within a single budget or request line.

ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS itens jsonb;
ALTER TABLE public.solicitacoes_orcamento ADD COLUMN IF NOT EXISTS itens jsonb;
