alter table public.orcamentos enable row level security;
alter table public.clientes enable row level security;

DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('orcamentos', 'clientes')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "Acesso total orcamentos autenticados"
  ON public.orcamentos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Acesso total clientes autenticados"
  ON public.clientes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
