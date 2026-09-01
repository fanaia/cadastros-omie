# API pública do `@oondemand/oon-core-back`

Importe exclusivamente de `@oondemand/oon-core-back`. Caminhos internos não têm estabilidade garantida.

## Boot e definição

- `start(options)`: carrega a Central, conecta Mongo, inicializa capabilities e inicia HTTP. `options.listen=false` devolve somente o app.
- `createApp()`: cria o Express já protegido e com rotas do Core.
- `activate()`: fluxo legado de ativação; não é usado no runtime local.
- `defineCentral`, `defineModel`, `defineCollection`, `defineDocument`, `definePipeline`, `defineOmieMapping`, `defineRoutes`, `defineValidation`, `defineTrigger`: extensões imperativas suportadas.
- `fields`: factories de campos compatíveis com schema e metadata.
- `registry`: registry do processo; use APIs `define*`, não mutações internas.

## Segurança, RBAC e tenant

- `requirePermission(permission)`: middleware obrigatório em rotas sensíveis.
- `CORE_PERMISSIONS`, `rbacPolicy`, `roleByCode`, `permissionGranted`: leitura e avaliação da política declarada.
- `TENANT_HEADER`, `TENANCY_MODELS`, `DATA_SCOPES`: constantes canônicas.
- `createAccessContext`, `readRequestedTenantId`: produzem contexto validado.
- `scopeFilter`, `mergeScopedFilter`, `scopeMutation`, `scopedIdFilter`: aplicam isolamento aos dados. Nunca aceite tenant do body como autoridade.

## Manifestos

- App: `APP_MANIFEST_FILENAME`, `APP_MANIFEST_SCHEMA_VERSION`, `SUPPORTED_APP_KINDS`, `SUPPORTED_APP_MODULES`, `AppManifestError`, `validateAppManifest`, `resolveAppManifestPath`, `appManifestToConfig`, `registerAppManifest`, `loadAppManifest`.
- Domínio: `DOMAIN_MANIFEST_FILENAME`, `DOMAIN_MANIFEST_SCHEMA_VERSION`, `SUPPORTED_DOMAIN_FIELD_KINDS`, `DOMAIN_EXPRESSION_OPERATORS`, `DomainManifestError`, `DomainRuleError`, `validateDomainManifest`, `domainManifestToDefinitions`, `registerDomainManifest`, `loadDomainManifest`, `evaluateDomainExpression`, `applyDomainMutation`, `validateDomainRecord`, `detectChangedFields`.
- Processo: `PROCESS_MANIFEST_FILENAME`, `PROCESS_MANIFEST_SCHEMA_VERSION`, `ProcessManifestError`, `validateProcessManifest`, `registerProcessManifest`, `loadProcessManifest`, `prepareProcessMutation`, `resolveProcessBindings`, `assertReferencePolicies`, `assertAtomicInvariants`, `assertDeleteAllowed`, `recalculateDependents`, `drainProcessJobs`.

Erros de manifesto carregam `code`, `statusCode` e `issues[]` com `path` e `message`.

## Integrações e capabilities

- `integrations`, `registerIntegrationProvider`, `enqueueIntegration`, `receiveIntegrationWebhook`.
- `omie`, `omieModule`, `createOmieClient`, `OmieApiError`, `enqueueOmieCall`, `ensureOmieProviderRegistered`, `collectOmieDefinitions`, `describeOmieDefinitions`, `saveOmieConfiguration`, `listOmieConfigurations`, `testOmieConnection`.
- `capabilities`, `PdfRenderingError`, `TransactionalEmailError`.
- `operationalRequestHeaders(options)`: headers de identidade do Deployment. Retorna `LOCAL_OPERATION_NOT_SUPPORTED` no runtime local; nunca improvise identidade local.

## Runtime local

O namespace público `localDevelopment` expõe detecção, validação de loopback e utilitários de teste/integração do runtime. Apps consumidores normalmente apenas definem `OON_RUNTIME_MODE=local` e usam o scaffold.

## Erros

`GenericError(message, { statusCode, code, details })` é o erro operacional base. Rotas devem lançá-lo e deixar o middleware do Core produzir o envelope sanitizado.
