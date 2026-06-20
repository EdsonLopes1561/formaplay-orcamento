-- Remover políticas antigas da tabela orcamentos
DROP POLICY IF EXISTS "Allow public select on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Allow public insert on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Allow public delete on orcamentos" ON orcamentos;
DROP POLICY IF EXISTS "Allow public update on orcamentos" ON orcamentos;

-- Criar nova política segura para orcamentos
CREATE POLICY "Allow authenticated full access on orcamentos"
  ON orcamentos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Remover políticas antigas da tabela clientes
DROP POLICY IF EXISTS "Allow public select on clientes" ON clientes;
DROP POLICY IF EXISTS "Allow public insert on clientes" ON clientes;
DROP POLICY IF EXISTS "Allow public update on clientes" ON clientes;
DROP POLICY IF EXISTS "Allow public delete on clientes" ON clientes;

-- Criar nova política segura para clientes
CREATE POLICY "Allow authenticated full access on clientes"
  ON clientes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
