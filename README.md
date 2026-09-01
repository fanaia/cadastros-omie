# Cadastros Omie

Bounded context de clientes/fornecedores, projetos, categorias, departamentos, anexos e seletores reutilizáveis. É um side-car multibase: o Omie permanece fonte de verdade e a Oon mantém projeções, governança e extensões.

## Documentação antes do código

- [Contexto exclusivo (24 seções)](docs/contexto-exclusivo.md)
- [Catálogo inicial de operações](docs/operacoes-omie.md)
- [Plano de implementação](docs/plano-implementacao.md)
- [ADR-001 — Fonte de verdade e projeções](docs/adr/001-fonte-de-verdade-e-projecoes.md)
- [ADR-002 — Dependência de conexão](docs/adr/002-dependencia-de-conexao.md)

## Estado

O primeiro incremento implementa projeções, UI de consulta e o contrato inicial do adapter Omie próprio do side-car. Mutações e sincronização real dependem da resolução autorizada de `configuracoes-omie`; este app não persiste credenciais e não usa `core.integrations.omie`.

Código: `cadastros-omie`. A branch `main` publica automaticamente em Dev pelo fluxo governado da Plataforma Oon.
