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

Implementado em OonCore 0.6.1 com frontend code-first. O app oferece dashboard multibase, pesquisa de clientes/fornecedores, cadastros auxiliares, inclusão idempotente de parceiros e projetos e uma central de sincronização. A sincronização percorre todas as páginas disponíveis e atualiza projeções por `tenantId + connectionId + externalId`, preservando o isolamento e a visibilidade de cada base. As credenciais são resolvidas de forma efêmera no backend de `configuracoes-omie`; este app não as aceita nem persiste.

## Validação

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm run check
npm run build --prefix frontend
```

Código: `cadastros-omie`. A branch `main` publica automaticamente em Dev pelo fluxo governado da Plataforma Oon.
