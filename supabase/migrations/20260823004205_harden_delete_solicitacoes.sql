-- Migration: harden_delete_solicitacoes.sql
-- Restringe a exclusão de solicitações de orçamento apenas para o perfil Administrador,
-- exigindo que o status seja 'Arquivada' e não exista vínculo com orçamento.

-- 1. Remove a política antiga que permitia DELETE para qualquer usuário autenticado
DROP POLICY IF EXISTS "Apenas admin (auth) pode deletar solicitacoes" ON public.solicitacoes_orcamento;

-- 2. Cria a nova política restritiva baseada no RBAC e regra de negócio
CREATE POLICY "Exclusao de solicitacoes apenas para Administrador"
ON public.solicitacoes_orcamento
FOR DELETE
TO authenticated
USING (
  public.usuario_app_autorizado(ARRAY['administrador'])
  AND status = 'Arquivada'
  AND orcamento_id IS NULL
);
