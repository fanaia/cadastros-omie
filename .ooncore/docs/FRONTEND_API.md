# API pública do `@oondemand/oon-core-front`

Importe exclusivamente da raiz do pacote.

## Bootstrap e manifestos

- `start`, `oonCoreFront.start`: inicialização com configuração completa.
- `startFromManifest`, `startCentralFromManifest`, `manifestToConfig`: caminho preferencial para uma Central declarativa.
- Tipos: `CentralUiManifest`, `CentralAppManifest`, `CentralManifestBundle`, `CentralUiOnlyManifest`, `ManifestRuntime`.
- `ManifestRuntime.runtimeMode`: `local` usa sessão HttpOnly; `platform` usa o contrato de autenticação publicado.

## Views e componentes

- Definições: `defineCollectionView`, `defineDocumentView`, `definePipelineView`, `defineDashboard`, `defineOonModule`.
- Componentes: `CoreCollection`, `CoreDocument`, `CorePipeline`, `CoreIntegration`, `CoreCurrency`, `CoreAssistant`, `CoreDashboard`, `CoreUsersAccess`, `CoreTransactionalEmail`, `CorePage`.
- Primitivas UI v2: `CorePageHeader`, `CoreToolbar`, `CoreDataGrid`, `CoreCards`, `CoreForm`, `CoreField`, `CoreRelationField`, `CoreActions`, `CoreEmptyState`, `CoreLoadingState`.
- Registre componentes customizados por chave em `registry`; não serialize React no JSON.

## Hooks, sessão e autorização

- `useOonAuth`, `can`, `PermissionGate`, `Can`: experiência baseada em permissões já resolvidas pelo backend.
- `useOonTenant`, `createTenantStorage`: seleção de tenant; o backend continua sendo a autoridade.
- `useOonApi`, `useOonResource`, `useCoreMetadata`, `useModelSchema`: acesso HTTP/metadata padronizado.
- O runtime local não grava bearer no `localStorage`, envia cookie com `withCredentials` e usa CSRF double-submit nas mutações.

## Domínio reativo

- `DomainExpressionError`, `evaluateDomainExpression`, `applyReactiveFormulas`, `buildDomainMutationPayload`, `coerceDomainFormValue`.
- Tipos `OonDomainExpression`, `OonComputedFieldDefinition`, `OonReactiveFormField` e `ReactiveFormulaResult`.
- A prévia do frontend nunca substitui o recálculo e a validação do backend.

## Tipos públicos

Os tipos exportados incluem config, app, auth, runtime, módulos, rotas, menus, UI v1/v2, layout, registry, páginas, blocos, ações, views, campos, metadata, paginação, erros e usuário. Consulte `dist/index.d.ts` da versão instalada quando precisar da assinatura exata; ele faz parte do pacote público.
