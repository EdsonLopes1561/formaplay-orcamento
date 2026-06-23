-- Migration to add institutional fields to clientes and orcamentos tables

-- Campos para a tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contato_responsavel text;

-- Campos para a tabela orcamentos
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS tipo_frete text;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS frete_incluso boolean DEFAULT false;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS observacao_frete text;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS forma_pagamento_personalizada text;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS condicoes_pagamento text;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS informacoes_complementares text;
