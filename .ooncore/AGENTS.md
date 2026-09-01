# OonCore — entrada canônica para IA/Agents

Este arquivo é o contrato inicial neutro para Codex, ChatGPT, Kimi, Manus e outros Agents que alterem uma Central Oon.

## Ordem de leitura

1. Leia primeiro o `AGENTS.md` da raiz do projeto consumidor, quando existir.
2. Confirme `schemaVersion`, `version`, `docsHash` e `entrypointsHash` em `.ooncore/manifest.json`.
3. Rode `npm run ooncore:docs:check`; se falhar, rode `npm run ooncore:docs` e verifique novamente.
4. Consulte `docs/CAPABILITIES.md` antes de criar código.
5. Leia os contratos de backend, frontend, runtime, RBAC ou integração indicados abaixo.
6. Leia a documentação de domínio do projeto consumidor.

O `AGENTS.md` da raiz pertence ao projeto e nunca pode ser sobrescrito pelo scaffold ou pelo sync do Core.

## Roteamento por tarefa

| Tarefa | Leitura obrigatória |
|---|---|
| Domínio, models, validações e fórmulas | `BACKEND_API.md`, `BACKEND_DOMAIN_MANIFEST.md`, `BACKEND_PATTERNS.md`, `REACTIVE_DOMAIN_FORMULAS.md` |
| CRUD, metadata e UI | `METADATA_CRUD_UI.md`, `FRONTEND_API.md`, `FRONTEND_MANIFEST_REFERENCE.md` |
| Auth, ativação, tenant ou permissões | `AUTH_ACTIVATION_RBAC.md`, `RBAC_SECURITY.md`, `DO_AND_DONT.md` |
| Execução local | `RUNTIME_MODES.md`, `LOCAL_DEVELOPMENT.md`, `LOCAL_SECURITY_BOUNDARY.md` |
| Rotas, hooks, jobs e filas | `ROUTES_HOOKS_WORKERS.md`, `BACKEND_PATTERNS.md` |
| Integrações | `CONNECTORS_AND_INTEGRATIONS.md`, `LOCAL_SECURITY_BOUNDARY.md` |
| Upgrade do Core | `CORE_UPGRADE.md`, `TESTING_CONFORMANCE.md`, `releases/0.5.0.md` |
| UX avançada | `ADVANCED_UX_PATTERNS.md`, `DETAIL_MODAL_AND_RELATED_GRIDS.md`, `PORTAL_COCKPIT_PATTERNS.md` |

## Fronteira obrigatória

- A Central declara domínio e experiência; o Core fornece bootstrap, autenticação, ativação, RBAC, tenant, CRUD, metadata, shell, componentes genéricos, integração operacional e deployment.
- Use somente exports públicos documentados. Arquivos internos de `src/` não são contrato de extensão.
- Autorização, tenant e regras que alteram dados são sempre validados no backend.
- Não crie autenticação, ativação, RBAC, CRUD, shell, registry ou infraestrutura paralelos.
- Não coloque segredos em manifesto, frontend, log, URL permanente ou documentação.
- Recursos de plataforma devem falhar fechado no runtime local.

## Gates antes de concluir

```bash
npm run ooncore:docs:check
npm run ooncore:conformance
npm run check
npm test
```

Se um contrato público exigir leitura do repositório privado do OonCore, registre a lacuna: a documentação distribuída está incompleta.
