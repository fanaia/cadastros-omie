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

## Estado

O app possui uma página operacional de Inicialização para selecionar a conexão autorizada, definir o escopo e testar clientes/fornecedores, categorias, departamentos e projetos em modo somente leitura. As credenciais são resolvidas de forma efêmera no backend de `configuracoes-omie`; este app não as aceita nem persiste e não usa `core.integrations.omie`.

Código: `cadastros-omie`. A branch `main` publica automaticamente em Dev pelo fluxo governado da Plataforma Oon.
