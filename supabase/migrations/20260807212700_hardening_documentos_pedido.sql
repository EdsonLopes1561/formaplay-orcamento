-- Migration: hardening_documentos_pedido.sql
-- Etapa 3A: Restrições adicionais de segurança na tabela documentos_pedido

-- 1. REMOVER a policy genérica de INSERT do perfil producao
DROP POLICY IF EXISTS "Inserção de documentos permitida para staff" ON public.documentos_pedido;

-- 2. RECRIAR a policy de INSERT para Admin e Comercial (todos os tipos, qualquer visibilidade)
CREATE POLICY "Inserção de documentos para Admin e Comercial"
ON public.documentos_pedido FOR INSERT TO authenticated
WITH CHECK (
  public.usuario_app_autorizado(ARRAY['administrador', 'comercial'])
  AND created_by = auth.uid()
);

-- 3. Policy de INSERT exclusiva para Produção:
--    - somente tipo 'comprovante_envio'
--    - visivel_cliente deve ser false obrigatoriamente
CREATE POLICY "Inserção restrita para Produção"
ON public.documentos_pedido FOR INSERT TO authenticated
WITH CHECK (
  public.usuario_app_autorizado(ARRAY['producao'])
  AND tipo_documento = 'comprovante_envio'
  AND visivel_cliente = false
  AND created_by = auth.uid()
);

-- 4. CREATED_BY IMUTÁVEL via trigger
--    O campo created_by nunca poderá ser alterado após a criação do registro.
CREATE OR REPLACE FUNCTION public.proteger_created_by_documentos()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se tentar mudar o created_by, reverte silenciosamente para o valor original
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_created_by_documentos ON public.documentos_pedido;
CREATE TRIGGER trg_proteger_created_by_documentos
  BEFORE UPDATE ON public.documentos_pedido
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_created_by_documentos();
