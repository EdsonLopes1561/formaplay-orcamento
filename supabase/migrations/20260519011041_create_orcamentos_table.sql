/*
  # Create orcamentos table

  1. New Tables
    - `orcamentos`
      - `id` (uuid, primary key)
      - `numero` (text) - budget number like #0001
      - `cliente` (text)
      - `telefone` (text)
      - `cidade` (text) - city/UF
      - `email` (text)
      - `produto` (text)
      - `quantidade` (numeric)
      - `valor_unitario` (numeric)
      - `frete` (numeric)
      - `desconto` (numeric)
      - `subtotal` (numeric)
      - `total` (numeric)
      - `prazo_entrega` (text)
      - `validade` (text)
      - `pagamento` (text)
      - `observacoes` (text)
      - `data_orcamento` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `orcamentos` table
    - Add policy for anonymous access (public commercial quotation system)
*/

CREATE TABLE IF NOT EXISTS orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL DEFAULT '',
  cliente text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  produto text NOT NULL DEFAULT '',
  quantidade numeric NOT NULL DEFAULT 1,
  valor_unitario numeric NOT NULL DEFAULT 0,
  frete numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  prazo_entrega text NOT NULL DEFAULT '',
  validade text NOT NULL DEFAULT '',
  pagamento text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  data_orcamento text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on orcamentos"
  ON orcamentos FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert on orcamentos"
  ON orcamentos FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public delete on orcamentos"
  ON orcamentos FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow public update on orcamentos"
  ON orcamentos FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
