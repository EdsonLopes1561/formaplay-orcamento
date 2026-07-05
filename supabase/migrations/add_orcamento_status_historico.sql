-- Criação da tabela de histórico
CREATE TABLE IF NOT EXISTS public.orcamento_status_historico (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id uuid NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
    status text NOT NULL,
    data_status timestamp with time zone NOT NULL DEFAULT now(),
    observacao_publica text,
    criado_em timestamp with time zone NOT NULL DEFAULT now()
);

-- Criação dos índices para performance
CREATE INDEX IF NOT EXISTS idx_orcamento_status_historico_orcamento_id 
ON public.orcamento_status_historico (orcamento_id);

CREATE INDEX IF NOT EXISTS idx_orcamento_status_historico_status 
ON public.orcamento_status_historico (status);

CREATE INDEX IF NOT EXISTS idx_orcamento_status_historico_data_status 
ON public.orcamento_status_historico (data_status);

-- Função da Trigger para registrar automaticamente
CREATE OR REPLACE FUNCTION public.registrar_historico_status_orcamento()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verifica se a operação é um INSERT
    IF TG_OP = 'INSERT' THEN
        IF NULLIF(TRIM(NEW.status_acompanhamento), '') IS NOT NULL THEN
            INSERT INTO public.orcamento_status_historico (
                orcamento_id,
                status,
                data_status,
                observacao_publica
            ) VALUES (
                NEW.id,
                TRIM(NEW.status_acompanhamento),
                COALESCE(NEW.status_atualizado_em, now()),
                NEW.observacao_publica_status
            );
        END IF;
        
    -- Verifica se a operação é um UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status_acompanhamento IS DISTINCT FROM NEW.status_acompanhamento 
           AND NULLIF(TRIM(NEW.status_acompanhamento), '') IS NOT NULL THEN
            
            INSERT INTO public.orcamento_status_historico (
                orcamento_id,
                status,
                data_status,
                observacao_publica
            ) VALUES (
                NEW.id,
                TRIM(NEW.status_acompanhamento),
                COALESCE(NEW.status_atualizado_em, now()),
                NEW.observacao_publica_status
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove a trigger se já existir para garantir idempotência
DROP TRIGGER IF EXISTS trigger_registrar_historico_status ON public.orcamentos;

-- Criação da Trigger atrelada à tabela orcamentos
CREATE TRIGGER trigger_registrar_historico_status
AFTER INSERT OR UPDATE OF status_acompanhamento
ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_status_orcamento();
