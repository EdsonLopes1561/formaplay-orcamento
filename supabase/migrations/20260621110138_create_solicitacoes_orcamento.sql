-- Criar a sequencia com schema explicito para garantir numero unico e sem race conditions
CREATE SEQUENCE IF NOT EXISTS public.solicitacoes_codigo_seq START 1;

-- Criar a tabela de solicitacoes de orcamento (Caixa de Entrada / Leads)
CREATE TABLE IF NOT EXISTS public.solicitacoes_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE,
    nome_razao TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT NOT NULL,
    email TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    jogo_escolhido TEXT NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade >= 1),
    valor_estimado NUMERIC DEFAULT 0,
    frete_estimado NUMERIC DEFAULT 0,
    desconto_pix NUMERIC DEFAULT 0,
    total_estimado NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Convertida', 'Arquivada', 'Spam')),
    observacoes_cliente TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS (Seguranca em nivel de linha)
ALTER TABLE public.solicitacoes_orcamento ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- POLICIES DE RLS
-- =======================================================

-- Policy 1: Publico/anonimo SÓ PODE INSERIR novos pedidos
CREATE POLICY "Permitir insert anonimo em solicitacoes"
ON public.solicitacoes_orcamento
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy 2: FormaPlay (autenticada) pode LER
CREATE POLICY "Apenas admin (auth) pode ler solicitacoes"
ON public.solicitacoes_orcamento
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: FormaPlay (autenticada) pode ATUALIZAR
CREATE POLICY "Apenas admin (auth) pode atualizar solicitacoes"
ON public.solicitacoes_orcamento
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: FormaPlay (autenticada) pode DELETAR
CREATE POLICY "Apenas admin (auth) pode deletar solicitacoes"
ON public.solicitacoes_orcamento
FOR DELETE
TO authenticated
USING (true);

-- =======================================================
-- TRIGGER E FUNCAO PARA GERAR SOL-0001
-- =======================================================

-- Funcao no schema explicito public com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.generate_solicitacao_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Forcar sempre a geracao, sobrescrevendo qualquer valor enviado
    NEW.codigo := 'SOL-' || LPAD(nextval('public.solicitacoes_codigo_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

-- Trigger disparado antes de CADA insert, independente de ja terem passado um codigo
CREATE TRIGGER set_solicitacao_codigo
BEFORE INSERT ON public.solicitacoes_orcamento
FOR EACH ROW
EXECUTE FUNCTION public.generate_solicitacao_codigo();
