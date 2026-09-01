# Contexto exclusivo — Cadastros Omie

```yaml
moduleId: registrations
moduleSlug: cadastros-omie
specVersion: 0.1.0
owners:
  product: Fábio Anaia Aiello
  engineering: a definir
  implementation: a definir
status: discovery
omieDocumentationSnapshot: 2026-09-01
dependencies:
  - configuracoes-omie: capability de conexão multibase
openRisks:
  - duplicidade por código de integração dentro da mesma base
  - cache auxiliar desatualizado
  - mutação parcial após timeout
  - anexos grandes e dados pessoais
adrs:
  - docs/adr/001-fonte-de-verdade-e-projecoes.md
  - docs/adr/002-dependencia-de-conexao.md
targetRelease: onda-0-fundacao
```

Este documento define o bounded context de cadastros compartilhados. A UI não chama a Omie diretamente, o domínio não importa DTO bruto, o módulo não persiste credenciais e a capacidade nativa `core.integrations.omie` não é utilizada.

## 01. Objetivo e fronteira funcional

Oferecer experiência multibase unificada para clientes/fornecedores, categorias, departamentos, projetos e seletores reutilizáveis. O Omie permanece fonte de verdade dos cadastros suportados por API; o Oon mantém projeções, estado de sincronização, governança e extensões.

MVP: clientes/fornecedores, categorias, departamentos e projetos; listagem, consulta, criação/alteração quando o adapter estiver homologado, sincronização incremental e pickers. Tags e anexos entram em ondas próprias. Produtos, serviços, vendedores, contas correntes e documentos transacionais pertencem a outros contextos.

## 02. Personas e responsabilidades

- Operador: consulta e mantém cadastros conforme permissão por conexão.
- Administrador do tenant: concede acesso a bases e ações.
- Implantador: valida mapeamentos, massa, duplicidades e aceite.
- Desenvolvedor: mantém contratos, mappers, sync e testes.
- Auditor: acompanha origem, alteração, conflito e reprocessamento.

## 03. Mapa de telas Omie

Telas-alvo: Clientes e Fornecedores, Projetos, Categorias, Departamentos e Documentos Anexos. O mapa detalhado de abas/ações da UI Omie depende de acesso de homologação e será evidenciado na sub-issue G0; nenhuma função sem API pública será prometida.

## 04. Inventário funcional

1. Selecionar uma ou mais conexões autorizadas.
2. Listar e consultar preservando a base de origem.
3. Criar/alterar cliente ou fornecedor com código de integração idempotente.
4. Criar/alterar projeto, categoria ou departamento quando suportado.
5. Sincronizar incrementalmente e reconciliar varredura completa.
6. Identificar conflito/duplicidade sem sobrescrever silenciosamente.
7. Fornecer pickers versionados para módulos consumidores.
8. Anexar/listar/obter/excluir documentos em uma onda posterior.

## 05. Campos por operação

| Entidade | Obrigatórios Oon no MVP | Observações |
| --- | --- | --- |
| Cliente/fornecedor | conexão, razão social, código de integração; ao menos um papel | CNPJ/CPF e nome fantasia são condicionais aos usos fiscais; limites oficiais registrados na matriz |
| Projeto | conexão, `codInt`, nome, ativo/inativo | `codInt` máximo 20 e nome máximo 70 na API consultada |
| Categoria | conexão, descrição, natureza/tipo conforme hierarquia | regras DRE e grupo exigem descoberta própria |
| Departamento | conexão, código, descrição | código máximo 40, descrição máximo 50 |

Campos técnicos (`externalId`, hash, sync state, timestamps, último erro) são controlados pelo servidor.

## 06. Matriz de paridade

| Unidade | Classe | Evidência | Decisão |
| --- | --- | --- | --- |
| CRUD cliente/fornecedor | A | ClientesCadastro v1 | após contrato e idempotência |
| CRUD projeto | A | ProjetosCadastro v1 | MVP |
| CRUD departamento | A | DepartamentosCadastro v1 | MVP |
| CRUD/listagem categoria | A | CategoriasCadastro v1 | MVP com regras de hierarquia |
| Visão consolidada multibase | E | OonCore/Oon-App | preserva origem |
| Pickers reutilizáveis | E | capability Cadastros | contrato versionado |
| Anexos | A | DocumentoAnexo v1 | onda posterior |

## 07. APIs Omie

Snapshot oficial em 2026-09-01:

- Clientes/fornecedores: https://app.omie.com.br/api/v1/geral/clientes/
- Projetos: https://app.omie.com.br/api/v1/geral/projetos/
- Departamentos: https://app.omie.com.br/api/v1/geral/departamentos/
- Categorias: https://app.omie.com.br/api/v1/geral/categorias/
- Anexos: https://app.omie.com.br/api/v1/geral/anexo/
- Catálogo: https://developer.omie.com.br/service-list/

Métodos deprecated não entram em código novo. Calls e campos são revalidados antes de cada release.

## 08. Contratos request/response

DTOs Omie existem apenas no adapter. O domínio usa nomes canônicos e envelope com conexão, origem, ids, estado de sync e auditoria. Mutações exigem `Idempotency-Key`; a resposta pública normaliza erros e fornece `correlationId`.

## 09. Cadastros auxiliares

Categorias, departamentos e projetos são projeções locais e pickers compartilhados. Cache usa TTL mais checkpoint; valores inativos permanecem visíveis em registros históricos, mas não são selecionáveis em novas operações. Cidades/países/tipos serão adicionados quando um consumidor justificar.

## 10. Modelo de domínio

- `PartnerProjection`: cliente, fornecedor, transportadora ou combinação.
- `CategoryProjection`: categoria/grupo, hierarquia e natureza.
- `DepartmentProjection`: departamento/centro de custo.
- `ProjectProjection`: projeto Omie.
- `AttachmentReference`: metadados e hash; bytes somente quando necessário.

Invariantes: toda projeção possui conexão; ids externos só são únicos dentro da base; mutações não sobrescrevem conflitos; origem Omie é preservada.

## 11. Estados e transições

Estado técnico: `pending`, `syncing`, `synced`, `conflict`, `error`, `inactive`. Commands locais criam intenção `pending`; somente o worker/adapter marca `synced`. Conflito exige reconciliação ou decisão explícita.

## 12. Operações especiais

Upsert só é usado quando a semântica estiver comprovada. Após timeout de escrita, consultar por código de integração/externalId antes de reenviar. Exclusão é bloqueada quando houver referência ou quando a API não garantir reversibilidade; inativação é preferida quando for a operação do Omie.

## 13. Multibase

Cada filtro e mutação inclui uma conexão autorizada. Consolidação é somente leitura na primeira onda. Criação/edição ocorre em uma única base por comando. Timezone e ambiente vêm do contexto confiável.

## 14. Modelo de dados Oon

Projeções usam índice composto por tenant+ambiente+conexão+externalId e por conexão+integrationCode. O manifesto inicial não suporta índice composto; a migration será entregue na sub-issue de persistência. Payload bruto não é persistido por padrão; fixtures são anonimizadas.

## 15. RBAC

Permissões por recurso/ação/conexão: `cadastros.partner.read|write|sync.connection`, equivalentes para category, department e project; `cadastros.attachment.read|write.connection`; `cadastros.picker.read.connection`; `cadastros.audit.read`. O backend aplica deny-by-default.

## 16. Workflows Oon+

Conflitos e falhas definitivas geram tickets de integração com responsável, SLA e reprocessamento. Aprovação de criação/alteração poderá ser habilitada por tenant, sem mudar o contrato do adapter.

## 17. Frontend

Rotas: `/`, `/clientes-fornecedores`, `/categorias`, `/departamentos`, `/projetos`, e futuramente `/anexos`. Grid sempre exibe base e estado de sync. Formulários agrupam identificação, endereço, contatos e fiscal conforme escopo aprovado. Pickers exibem base, status e origem.

## 18. Backend

Casos de uso recebem conexão já autorizada pelo contrato de Configurações. O adapter próprio deste side-car traduz os contratos oficiais e usa material efêmero resolvido apenas no backend. Jobs serializam escrita por conexão, aplicam idempotência, outbox e auditoria. Nenhuma rota pública recebe credencial.

## 19. Sincronização e webhooks

Listagem incremental por data/hora quando suportada, com overlap; paginação e checkpoint por conexão+entidade. Varredura completa detecta alterações/exclusões não observáveis. Webhooks usam inbox idempotente quando disponíveis; polling continua como reconciliação.

## 20. Erros e resiliência

Taxonomia comum Oon. Retry de consulta é seguro; mutação pós-timeout reconcilia. Rate limit e circuit breaker são aplicados por conexão no adapter local e coordenados pelo contrato operacional de Configurações. DLQ guarda referência mascarada e permite reprocessar seletivamente.

## 21. Segurança e LGPD

CNPJ/CPF, contatos, endereços e anexos são dados pessoais/empresariais protegidos. Aplicar minimização, masking, retenção e exportação auditada. Proibir credenciais e payloads integrais em log. Testar enumeração de ids e acesso cruzado.

## 22. Observabilidade e SLO

Métricas por entidade/call/conexão: páginas, itens, lag, conflitos, erros, retries e último sucesso. Traces carregam `operationId` e `correlationId`. Metas quantitativas são aprovadas antes de produção.

## 23. Plano de testes

Unitários de mappers e invariantes; contratos por call; integração com capability de conexão; idempotência e timeout; paginação/checkpoint; isolamento multibase; E2E criar→consultar→alterar→sincronizar; carga; segurança; acessibilidade dos grids e formulários.

## 24. Homologação e rollout

Homologar duas bases do mesmo tenant e uma de tenant distinto, cobrindo registros ativos/inativos, duplicidade, paginação, falha, reprocessamento e picker consumidor. O rollout depende de `configuracoes-omie`, runbook e dashboard. Sem contorno para registros legados inconsistentes nesta fase.

## Gate atual

G0 documentado. G1 inicia com projeções declarativas, UI de consulta e contrato do adapter local. Mutações Omie e sincronização real permanecem bloqueadas até o contrato de Configurações, cofre, transporte do adapter e testes de isolamento estarem prontos.
