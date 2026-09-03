# Cadastros Omie

Bounded context de clientes/fornecedores, projetos, categorias, departamentos, anexos e seletores reutilizáveis. É um side-car multibase: o Omie permanece fonte de verdade e a Oon mantém projeções, governança e extensões.

## Documentação antes do código

- [Contexto exclusivo (24 seções)](docs/contexto-exclusivo.md)
- [Catálogo inicial de operações](docs/operacoes-omie.md)
- [Plano de implementação](docs/plano-implementacao.md)
- [Bootstrap e teste operacional de sincronização](docs/bootstrap-inicializacao.md)
- [UX operacional](docs/ux-operacional.md)
- [ADR-001 — Fonte de verdade e projeções](docs/adr/001-fonte-de-verdade-e-projecoes.md)
- [ADR-002 — Dependência de conexão](docs/adr/002-dependencia-de-conexao.md)

## Estado atual

Implementado em OonCore 0.6.1 com frontend code-first. A versão 0.5.0 opera como app single-tenant e multibase, com o tenant técnico fornecido exclusivamente pelo OonCore. O app oferece dashboard, pesquisa de clientes/fornecedores, cadastros auxiliares, inclusão idempotente de parceiros e projetos e uma central de sincronização. Cada base recebe um vínculo emitido pelo módulo Configurações Omie; o segredo técnico é cifrado em repouso e usado somente para assinar a resolução efêmera das credenciais Omie. O resultado por entidade, os códigos de falha e o protocolo permanecem visíveis após a execução. Falhas podem ser reprocessadas seletivamente com chave idempotente, lock por base e histórico auditável.

## Validação

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run check
npm run build --prefix frontend
```

Código: `cadastros-omie`. A branch `main` publica automaticamente em Dev pelo fluxo governado da Plataforma Oon.
