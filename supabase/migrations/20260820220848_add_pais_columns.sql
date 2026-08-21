ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS pais text;

ALTER TABLE orcamentos
ADD COLUMN IF NOT EXISTS cliente_pais text;

ALTER TABLE solicitacoes_orcamento
ADD COLUMN IF NOT EXISTS pais text;

ALTER TABLE interesses_modelos
ADD COLUMN IF NOT EXISTS pais text;
