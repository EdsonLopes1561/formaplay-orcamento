-- Criação Dinâmica da Sequence baseada no maior número existente
DO $$
DECLARE
    max_num INTEGER;
BEGIN
    -- Obter o maior número atual da coluna 'numero' extraindo apenas os dígitos
    SELECT COALESCE(
             MAX(
               NULLIF(regexp_replace(numero, '\D', '', 'g'), '')::INTEGER
             ), 0
           )
    INTO max_num
    FROM public.orcamentos;
    
    -- Criar a sequence
    CREATE SEQUENCE IF NOT EXISTS public.orcamentos_numero_seq;
    
    -- Definir o valor atual da sequence para o maior número encontrado
    -- Assim o próximo nextval() será max_num + 1
    PERFORM setval('public.orcamentos_numero_seq', max_num);
END
$$;

-- Criar a Função da Trigger de maneira segura
CREATE OR REPLACE FUNCTION public.set_orcamento_numero()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só preenche se o número estiver vazio ou NULL
  IF NEW.numero IS NULL OR TRIM(NEW.numero) = '' THEN
    NEW.numero := '#' || LPAD(nextval('public.orcamentos_numero_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Anexa a Trigger à tabela de orçamentos
DROP TRIGGER IF EXISTS trigger_set_orcamento_numero ON public.orcamentos;
CREATE TRIGGER trigger_set_orcamento_numero
BEFORE INSERT ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.set_orcamento_numero();

-- Adiciona a Unique Constraint para impedir duplicidades futuras
ALTER TABLE public.orcamentos ADD CONSTRAINT orcamentos_numero_unique UNIQUE (numero);

-- O GRANT USAGE na sequence não é necessário para anon ou authenticated
-- pois a trigger usa SECURITY DEFINER, rodando com privilégios de dono (postgres)
-- que automaticamente já possui permissão para usar o nextval.
