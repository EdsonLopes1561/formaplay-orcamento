# Auditoria de Segurança: RLS e Acesso Anônimo - FormaPlay

Este documento detalha o diagnóstico completo das políticas de segurança, permissões de tabela (GRANT) e Row Level Security (RLS) das tabelas `orcamentos`, `solicitacoes_orcamento` e `interesses_modelos`.

## 1. Verificação do Diagnóstico Anterior
Realizei testes isolados acessando a API do Supabase apenas com a chave `anon` (sem JWT). Os resultados reais provaram que:
- **`interesses_modelos`**: Bloqueia qualquer acesso de `anon`. Retorna erro HTTP **42501 (Permission Denied)**, pois a role não possui permissão de `GRANT`.
- **`orcamentos`**: O acesso foi **Autorizado**, porém retornou exatamente **0 registros** (`[]`). 
- **`solicitacoes_orcamento`**: O acesso foi **Autorizado**, porém retornou exatamente **0 registros** (`[]`).

**Conclusão**: O diagnóstico do desenvolvedor estava incorreto ao assumir que o Mapa conseguia ler interesses quando a sessão expirava. O Mapa mostrava Jaú porque Jaú possui *Orçamentos* e *Solicitações*. Quando a sessão expira, o Mapa tenta buscar dados de interesses e sofre o erro 42501 (que ele captura silenciosamente), mas consegue ler as tabelas de orçamentos e solicitações que retornam `[]`. Como o Mapa renderiza os dados que já estão no contexto principal, a ilusão ocorre.

---

## 2. Auditoria de Políticas RLS

### Tabela `orcamentos`
- **RLS Habilitado**: Sim
- **Policies Encontradas**:
  - `Acesso total orcamentos autenticados` (ALL) para `authenticated` usando `(true)`.
- **Acesso Anônimo Real**: Um visitante anônimo consegue disparar um SELECT, mas o Supabase não retorna nenhum dado (pois a policy para `anon` não existe).

### Tabela `solicitacoes_orcamento`
- **RLS Habilitado**: Sim
- **Policies Encontradas**:
  - `Permitir insert anonimo em solicitacoes` (INSERT) para `anon` com check `(true)`.
  - `Apenas admin (auth) pode ler/atualizar/deletar solicitacoes` (SELECT/UPDATE/DELETE) para `authenticated`.
- **Acesso Anônimo Real**: O visitante consegue registrar uma solicitação (INSERT). Se tentar um SELECT, a requisição passa pelo banco mas o RLS a barra, retornando vazio `[]`.

### Tabela `interesses_modelos`
- **RLS Habilitado**: Sim
- **Policies Encontradas**:
  - `Permitir INSERT anonimo pelo site` (INSERT) para `anon`.
  - `Admin e Comercial podem ler interesses` (SELECT) para `authenticated` usando `usuario_app_autorizado`.
  - `Admins podem atualizar interesses` (UPDATE) para `authenticated`.
- **Acesso Anônimo Real**: **NENHUM**. Embora exista uma policy de `INSERT` para `anon`, a tabela sofreu um `REVOKE ALL ON public.interesses_modelos FROM anon` em migrations passadas. Isso causa o erro fatal **42501** em qualquer interação pública, incluindo o preenchimento do formulário.

---

## 3. Diferença entre GRANT e RLS
Nesta infraestrutura:
- **GRANT** (Nível de Tabela): Determina se a requisição é aceita ou rejeitada imediatamente com erro `42501`. A tabela `interesses_modelos` rejeita. As outras tabelas aceitam porque mantiveram o comportamento padrão do Supabase (`GRANT SELECT`).
- **RLS** (Nível de Linha): Determina quais linhas são devolvidas. Para as tabelas que aceitam o GRANT, a ausência de uma policy de SELECT para `anon` age como um filtro perfeito, devolvendo `0 linhas` sem acusar erro.

---

## 4. Necessidade Funcional do Acesso Público
- **Formulário de Solicitação**: Necessita apenas de **INSERT** em `solicitacoes_orcamento`.
- **Formulário de Interesses**: Necessita apenas de **INSERT** em `interesses_modelos`. (Atualmente quebrado).
- **Acompanhamento de Pedido**: Necessita apenas executar a RPC `buscar_acompanhamento_pedido`. **NÃO NECESSITA** permissão de SELECT em nenhuma tabela.
- Áreas administrativas (Inbox, Mapa, Torre): Só precisam funcionar mediante token `authenticated` válido.

---

## 5. Proteção de Dados de Clientes (Auditoria)
Testei o SELECT na tabela `orcamentos` e `solicitacoes_orcamento` usando `anon` e confirmei tecnicamente que **nenhum dado é vazado**.
Apesar do GRANT estar aberto, o **RLS está devidamente habilitado e restritivo**. Informações como nome, telefone, valores e CPF estão integralmente protegidas contra listagem pública e raspagem de dados. 

---

## 6. Página Pública de Acompanhamento
O recurso de `/acompanhar-pedido/:token` é um caso de estudo excelente e uma ótima implementação de segurança.
Ele não consulta diretamente a tabela `orcamentos`. Ele chama a **RPC** `buscar_acompanhamento_pedido(p_token text)`.
Esta RPC foi configurada inteligentemente com **`SECURITY DEFINER`**. Isso significa que ela roda no Supabase com permissões de backend (ignorando o RLS do chamador), mas protege a lógica internamente limitando pelo `token_publico`. Ela também seleciona manualmente os campos a serem devolvidos e mascara o nome se não existir. Desta forma, a arquitetura está blindada e nenhum link anterior será quebrado por remoção de SELECT público.

---

## 7. Formulário de Solicitação Pública
O formulário de solicitação requer `GRANT INSERT` e uma Policy de INSERT para `anon`. 
Atualmente funciona perfeitamente, sem conceder acesso indevido às solicitações anteriores.

---

## 8. Painel de Interesses (A Causa Original)
- O erro `"Erro ao carregar interesses..."` ocorreu devido à **Sessão Expirada**. 
- Como a tabela não possui permissão de leitura global, o Supabase cliente usou a chave `anon` e recebeu `42501 Permission Denied`. O JS reagiu com um alerta de interface.
- O formulário público de interesse (se existir em produção) **está quebrado**, já que a revogação agressiva no banco removeu a permissão de INSERT para a chave pública.
- Fazer logout/login renova o JWT, altera a role da requisição para `authenticated` e restaura o funcionamento.

---

## 9. Classificação dos Riscos

| Tipo de Risco | Nível | Descrição / Justificativa |
| :--- | :--- | :--- |
| **Vazamento de Dados de Clientes** | **SEM RISCO** | RLS e arquitetura da RPC de acompanhamento barram acesso anônimo perfeitamente, garantindo a proteção de informações sensíveis (PII e comerciais). |
| **Paralisação de Funcionalidade Pública** | **ALTO** | Ausência de `GRANT INSERT` na tabela `interesses_modelos` bloqueia o registro de novos interesses vindos de ferramentas e sites externos. |
| **Quebra de Experiência do Usuário (Painel)** | **MÉDIO** | Se o token expira, a aplicação dispara um alerta (42501) genérico em vez de renovar a sessão ou deslogar o usuário perfeitamente. |
| **Defesa em Profundidade Ausente** | **BAIXO** | Tabelas confidenciais (`orcamentos`, `solicitacoes_orcamento`) ainda possuem o `GRANT SELECT` original. Embora o RLS barre os acessos, se o RLS fosse desativado por engano no futuro, a base vazaria imediatamente. |

---

## 10. Matriz de Acesso ATUAL (Testada)

| Tabela | anon SELECT | anon INSERT | anon UPDATE | anon DELETE | authenticated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `orcamentos` | *Aberto* (Retorna 0 - barrado RLS) | *Aberto* (Erro RLS) | Bloqueado (RLS) | Bloqueado (RLS) | Total (Auth válido) |
| `solicitacoes_orcamento` | *Aberto* (Retorna 0 - barrado RLS) | **Permitido (Funcional)** | Bloqueado (RLS) | Bloqueado (RLS) | Total (Auth válido) |
| `interesses_modelos` | **ERRO 42501 (Bloq Grant)** | **ERRO 42501 (Bloq Grant)** | ERRO (42501) | ERRO (42501) | Parcial (RBAC Role) |

---

## 11. Matriz de Acesso RECOMENDADA

| Tabela | anon SELECT | anon INSERT | anon UPDATE | anon DELETE | authenticated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `orcamentos` | **Negado (REVOKE)** | Negado (REVOKE) | Negado (REVOKE) | Negado (REVOKE) | Total (Auth válido) |
| `solicitacoes_orcamento` | **Negado (REVOKE)** | **Permitido (GRANT + Policy)** | Negado (REVOKE) | Negado (REVOKE) | Total (Auth válido) |
| `interesses_modelos` | **Negado (REVOKE)** | **Permitido (GRANT + Policy)** | Negado (REVOKE) | Negado (REVOKE) | Parcial (RBAC Role) |

---

## 12. Avaliação de RPCs Atuais
A arquitetura de acompanhamento utilizando a RPC `buscar_acompanhamento_pedido` associada ao `SECURITY DEFINER` e à filtragem rigorosa (token JWT/Token Público) é um excelente modelo de segurança. Não é recomendada, no momento, a criação de RPCs genéricas substitutas para formulários simples de inserção, uma vez que o RLS cumpre essa função de maneira mais manutenível e performática quando configurado corretamente.

---

## 13. Plano de Correção Seguro (Em 5 Etapas)

- **ETAPA 1:** **Restaurar Formulário de Interesses** (Correção Prioritária).
  Criar uma migration que devolva a permissão de inserir dados: `GRANT INSERT ON public.interesses_modelos TO anon;`
- **ETAPA 2:** **Implementar Defesa em Profundidade em Solicitações**
  Criar migration: `REVOKE SELECT, UPDATE, DELETE ON public.solicitacoes_orcamento FROM anon;`
- **ETAPA 3:** **Implementar Defesa em Profundidade em Orçamentos**
  Criar migration: `REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orcamentos FROM anon;`
- **ETAPA 4:** **Validação Administrativa**
  Checagem de impacto em ferramentas internas para garantir que as revogações para `anon` não afetaram `authenticated`.
- **ETAPA 5:** **Execução de Testes de Regressão Manuais.**

---

## 14. Testes de Regressão Necessários
Antes e após aplicação do plano de correção, será obrigatório testar os seguintes fluxos:
1. Cadastrar um novo interesse pelo formulário do site (Validar Correção Etapa 1).
2. Solicitar orçamento na landing page (Garantir que a Etapa 2 não quebrou as permissões de INSERT).
3. Abrir um acompanhamento público por link (`/acompanhar-pedido/:token`) através de guia anônima do navegador.
4. Logar na conta de *Administrador* e certificar o funcionamento e dados da:
   - Inbox de Solicitações.
   - Histórico de Orçamentos.
   - Painel de Interesses.
   - Torre de Controle.
   - Mapa de Presença Comercial.

---

## 15. Notas Finais
A segurança de infraestrutura de nuvem (como Supabase) demanda a coordenação harmoniosa de **Roles**, **Grants** e **Policies RLS**.
Muitos desenvolvedores focam estritamente no RLS e ignoram os GRANTs globais, deixando espaço para exploração de vulnerabilidades. Apesar das permissões um pouco permissivas em relação aos GRANTs da tabela de orçamentos, o rigor da engenharia no RLS protegeu completamente as informações de negócio de qualquer vazamento. 

O único dano encontrado é um bloqueio em ferramentas públicas (`interesses`) por revogação excessiva. Nenhuma alteração foi realizada até o momento.
