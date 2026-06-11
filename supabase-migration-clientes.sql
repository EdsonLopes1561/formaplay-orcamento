-- Migration: Create clientes table and add cliente_id to orcamentos

-- Create clientes table
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  inscricao_estadual TEXT,
  email TEXT,
  telefone TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  complemento TEXT,
  tipo_cliente TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add cliente_id to orcamentos table
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
