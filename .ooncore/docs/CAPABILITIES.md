# Catálogo de capacidades do OonCore

Consulte este catálogo antes de criar infraestrutura ou componentes customizados.

| Capacidade | Backend | Frontend | Declaração/extensão | Local | Plataforma |
|---|---|---|---|---|---|
| Models e CRUD | `defineModel`, domain manifest, `/core/*` | `CoreCollection`, hooks de API | `central.domain.json`, composição code-first | Sim | Sim |
| Metadata | registry e `/core/metadata` | `useCoreMetadata`, renderers | models/domain manifest | Sim | Sim |
| Validações e fórmulas | `defineValidation`, domain rules | prévia reativa | domain manifest/validation | Sim | Sim |
| Esteiras | process manifest/runtime | `CorePipeline` | `central.process.json`, UI manifest | Sim | Sim |
| Documentos | `defineDocument` | `CoreDocument` | UI/domain manifest | Sim | Sim |
| Dashboards | agregações e rotas | `CoreDashboard` | UI manifest | Sim | Sim |
| RBAC | policy, middleware e `requirePermission` | `PermissionGate`, `can` | `central.app.json` | Simulação declarada | Identidade real |
| Tenant e escopo | access context e scope helpers | `TenantProvider` | `central.app.json` | Contexto técnico | Contexto autorizado |
| Auditoria | CRUD e request context | headers do SDK | automática/extensão | Local | Operacional |
| Rotas customizadas | `defineRoutes` | página/ação declarada | `backend/src/routes` | Sim | Sim |
| Jobs e workers | process workers | status operacional | manifestos/hooks | Sim | Sim |
| E-mail transacional | capability nativa | `CoreTransactionalEmail` | capability settings | Dublê/local | Provider configurado |
| PDF | capability nativa | consumo por ação | capability contract | Dublê/local | Provider configurado |
| Publicação/promoção | contratos de delivery | indisponível no App | CLI/ponte pública | Não | Sim |
| Runtime local | sessão e guardas locais | bootstrap/cookie/banner | `OON_RUNTIME_MODE=local` | Sim | Não aplicável |

Para cada capacidade, use o manifesto quando houver contrato declarativo; use código da Central apenas em pontos de extensão documentados.
