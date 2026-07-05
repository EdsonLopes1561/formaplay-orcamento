-- Migration: Adicionar campos de produção (Ficha de Produção Interativa)
-- Tabela: public.orcamentos

ALTER TABLE public.orcamentos
ADD COLUMN IF NOT EXISTS status_producao text DEFAULT 'Não iniciada',
ADD COLUMN IF NOT EXISTS producao_checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS observacao_producao text,
ADD COLUMN IF NOT EXISTS producao_atualizado_em timestamp with time zone;

-- Observação sobre producao_checklist:
-- Este campo armazena um array de IDs simples para os itens concluídos.
-- Exemplo de uso: ["caixa_tampa", "caixa_fundo", "dado"]
-- Essa tabela não está exposta para o cliente na RPC pública buscar_acompanhamento_pedido.
