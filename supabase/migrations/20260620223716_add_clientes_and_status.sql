CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text NOT NULL,
  inscricao_estadual text NOT NULL DEFAULT '',
  email text NOT NULL,
  telefone text NOT NULL,
  cep text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  numero text NOT NULL DEFAULT '',
  bairro text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT '',
  complemento text NOT NULL DEFAULT '',
  tipo_cliente text NOT NULL DEFAULT 'Pessoa Física',
  observacoes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on clientes" ON clientes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert on clientes" ON clientes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update on clientes" ON clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on clientes" ON clientes FOR DELETE TO anon USING (true);

ALTER TABLE orcamentos 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Aberto',
ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL;
