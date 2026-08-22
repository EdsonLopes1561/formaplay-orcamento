-- Remove todos os privilégios básicos de tabela da role anon para orcamentos
REVOKE ALL PRIVILEGES ON TABLE public.orcamentos FROM anon;

-- Remove todos os privilégios básicos de tabela da role anon para solicitacoes_orcamento
REVOKE ALL PRIVILEGES ON TABLE public.solicitacoes_orcamento FROM anon;

-- Reestabelece unicamente o privilégio de INSERT em solicitacoes_orcamento para anon
-- (necessário para o formulário público do site captar leads)
GRANT INSERT ON TABLE public.solicitacoes_orcamento TO anon;
