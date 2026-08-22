-- Migration para adicionar vínculo forte entre Solicitações e Orçamentos
-- Essa alteração resolve o problema da Inbox perdendo rastreabilidade da conversão.

-- 1. Adicionando a coluna orcamento_id
ALTER TABLE "public"."solicitacoes_orcamento" 
ADD COLUMN "orcamento_id" UUID;

-- 2. Adicionando a Foreign Key (ON DELETE SET NULL para preservar histórico da solicitação caso o orçamento seja apagado)
ALTER TABLE "public"."solicitacoes_orcamento" 
ADD CONSTRAINT "solicitacoes_orcamento_orcamento_id_fkey" 
FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE SET NULL;

-- 3. Criando índice para otimizar queries na aba Convertida
CREATE INDEX "idx_solicitacoes_orcamento_orcamento_id" 
ON "public"."solicitacoes_orcamento"("orcamento_id");

-- OBS: RLS para UPDATE em solicitacoes_orcamento já existe e deve naturalmente 
-- abranger esta nova coluna se a política usar `FOR UPDATE USING (true)` ou similar para Admins.
