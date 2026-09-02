# Plano de implementação

## Incremento 1 — Projeções e navegação

- Models declarativos de cliente/fornecedor, categoria, departamento, projeto e referência de anexo.
- Campos técnicos readonly e `omieConnectionId` obrigatório.
- Coleções OonCore de consulta e filtros multibase.
- RBAC e testes estáticos dos manifestos.
- Catálogo de operações e adapter local com transporte/resolução injetáveis.

## Incremento 2 — Consumer contract e sincronização

- Resolver conexão pelo contrato versionado de `configuracoes-omie`.
- Completar o adapter local de listagem/consulta, paginação, checkpoint e reconciliação.
- Compound indexes/migration e tickets de falha.

## Incremento 3 — Mutações idempotentes

- Criar/alterar por entidade, começando por cliente/fornecedor e projeto.
- Reconciliação pós-timeout, auditoria e UI de conflito.
- Homologação em múltiplas bases.

## Incremento 4 — Pickers e anexos

- Capability versionada de pickers para consumidores.
- Tags e anexos com limites, hash, redaction e retenção.

## Gates

Nenhuma chamada real ocorre sem conexão autorizada, cofre e consumer contract. `core.integrations.omie` permanece desabilitado. Cada incremento atualiza paridade, contratos, ADRs, testes e evidências.

