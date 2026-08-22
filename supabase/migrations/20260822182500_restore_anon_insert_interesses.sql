-- Restaura a permissão básica de INSERT para a role anon, 
-- que havia sido revogada anteriormente por engano em REVOKE ALL.
-- Isso é necessário para que o formulário público de registro de interesses
-- no site consiga inserir novos registros, sendo protegido pela policy existente
-- "Permitir INSERT anonimo pelo site".

GRANT INSERT ON TABLE public.interesses_modelos TO anon;
