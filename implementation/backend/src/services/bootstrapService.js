const crypto = require("node:crypto");
const { registry } = require("@oondemand/oon-core-back");
const { createRegistrationAdapter } = require("../integrations/erp/adapter");
const { signExecutionRequest } = require("./executionSignature");
const { omieHttpTransport, postJson } = require("./httpTransport");

const ENTITY_DEFINITIONS = Object.freeze({
  partners: { label: "Clientes e fornecedores", operationId: "partner.list", permission: "cadastros.partner.sync.connection" },
  categories: { label: "Categorias", operationId: "category.list", permission: "cadastros.category.sync.connection" },
  departments: { label: "Departamentos", operationId: "department.list", permission: "cadastros.department.sync.connection" },
  projects: { label: "Projetos", operationId: "project.list", permission: "cadastros.project.sync.connection" },
});

function appError(code, message, statusCode = 400) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

function requiredText(value, field, maxLength = 200) {
  const text = String(value || "").trim();
  if (!text) throw appError("INVALID_INPUT", `${field} é obrigatório.`);
  if (text.length > maxLength) throw appError("INVALID_INPUT", `${field} excede o limite permitido.`);
  return text;
}

function model() {
  const entry = registry.getModel("RegistrationBootstrapState");
  if (!entry) throw appError("MODEL_NOT_READY", "Configuração de inicialização indisponível.", 503);
  return entry.mongooseModel;
}

function runtimeScope(accessContext = {}) {
  return {
    tenantId: requiredText(accessContext.tenantId, "tenantId", 160),
    actorId: requiredText(accessContext.userId, "actorId", 160),
    appInstanceId: requiredText(process.env.APP_INSTANCE_ID, "APP_INSTANCE_ID", 160),
    environment: requiredText(process.env.APP_ENVIRONMENT, "APP_ENVIRONMENT", 80),
  };
}

function scopeFilter(scope) {
  return { tenantId: scope.tenantId, appInstanceId: scope.appInstanceId, environment: scope.environment };
}

function normalizedServiceUrl() {
  const value = requiredText(process.env.OMIE_CONFIG_SERVICE_URL, "OMIE_CONFIG_SERVICE_URL", 500).replace(/\/+$/, "");
  let parsed;
  try { parsed = new URL(value); } catch { throw appError("INVALID_SERVICE_URL", "A URL do app Configurações é inválida.", 503); }
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "development" && local)) {
    throw appError("INVALID_SERVICE_URL", "A URL do app Configurações deve usar HTTPS.", 503);
  }
  return parsed.toString().replace(/\/$/, "");
}

function runtimeRequirements() {
  return [
    { name: "OMIE_CONFIG_SERVICE_URL", configured: Boolean(process.env.OMIE_CONFIG_SERVICE_URL), detail: "Localiza o backend do app Configurações." },
    { name: "OMIE_CONFIG_RESOLVER_SHARED_SECRET", configured: Boolean(process.env.OMIE_CONFIG_RESOLVER_SHARED_SECRET), detail: "Assina a resolução efêmera de conexão." },
    { name: "OMIE_CONFIG_APP_INSTANCE_ID", configured: Boolean(process.env.OMIE_CONFIG_APP_INSTANCE_ID), detail: "Seleciona a instância autorizada de Configurações." },
    { name: "APP_INSTANCE_ID", configured: Boolean(process.env.APP_INSTANCE_ID), detail: "Isola esta instância de Cadastros." },
    { name: "APP_ENVIRONMENT", configured: Boolean(process.env.APP_ENVIRONMENT), detail: "Isola o ambiente de execução." },
  ];
}

function normalizeEntities(values) {
  const selected = [...new Set((Array.isArray(values) ? values : []).map(String))];
  if (!selected.length || selected.some((value) => !ENTITY_DEFINITIONS[value])) {
    throw appError("INVALID_ENTITIES", "Selecione ao menos um cadastro válido.");
  }
  return selected;
}

async function describeBootstrap(accessContext) {
  const requirements = runtimeRequirements();
  let scope;
  try { scope = runtimeScope(accessContext); } catch { scope = null; }
  const state = scope ? await model().findOne(scopeFilter(scope)).lean() : null;
  return {
    requirements,
    ready: requirements.every((item) => item.configured) && Boolean(state) && state?.lastTestOutcome === "success",
    configuration: state ? {
      connectionId: state.connectionId,
      entities: state.entities,
      sampleSize: state.sampleSize,
      lastTestAt: state.lastTestAt,
      lastTestOutcome: state.lastTestOutcome,
      lastCorrelationId: state.lastCorrelationId,
      lastTestSummary: state.lastTestSummary,
    } : null,
    availableEntities: Object.entries(ENTITY_DEFINITIONS).map(([id, definition]) => ({ id, label: definition.label })),
    configurationService: {
      url: process.env.OMIE_CONFIG_SERVICE_URL || null,
      appInstanceId: process.env.OMIE_CONFIG_APP_INSTANCE_ID || null,
      environment: process.env.OMIE_CONFIG_ENVIRONMENT || process.env.APP_ENVIRONMENT || null,
    },
  };
}

async function saveBootstrap(accessContext, input = {}) {
  const scope = runtimeScope(accessContext);
  const connectionId = requiredText(input.connectionId, "connectionId", 160);
  const entities = normalizeEntities(input.entities);
  const sampleSize = Number(input.sampleSize || 10);
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 50) {
    throw appError("INVALID_SAMPLE_SIZE", "A amostra deve conter de 1 a 50 registros.");
  }
  await model().findOneAndUpdate(
    scopeFilter(scope),
    { $set: { connectionId, entities, sampleSize }, $setOnInsert: { lastTestOutcome: "not_tested" } },
    { upsert: true, new: true, runValidators: true },
  );
  return describeBootstrap(accessContext);
}

function canRun(accessContext, entity) {
  const permissions = accessContext.permissions || [];
  return permissions.includes("*") || permissions.includes(ENTITY_DEFINITIONS[entity].permission);
}

async function resolveExecutionContext({ scope, state, operationId, correlationId }) {
  const body = {
    tenantId: scope.tenantId,
    requesterAppInstanceId: scope.appInstanceId,
    configurationAppInstanceId: requiredText(process.env.OMIE_CONFIG_APP_INSTANCE_ID, "OMIE_CONFIG_APP_INSTANCE_ID", 160),
    environment: requiredText(process.env.OMIE_CONFIG_ENVIRONMENT || scope.environment, "OMIE_CONFIG_ENVIRONMENT", 80),
    actorId: scope.actorId,
    connectionId: state.connectionId,
    operationId,
    correlationId,
  };
  const timestamp = Date.now();
  const signature = signExecutionRequest(process.env.OMIE_CONFIG_RESOLVER_SHARED_SECRET, body, timestamp, "cadastros-omie");
  return postJson(`${normalizedServiceUrl()}/api/omie-config/execution-context`, {
    body,
    timeoutMs: 10000,
    headers: {
      "x-omie-config-client": "cadastros-omie",
      "x-omie-config-timestamp": String(timestamp),
      "x-omie-config-signature": signature,
    },
  });
}

function countProviderRecords(payload = {}) {
  for (const key of ["clientes_cadastro", "categorias", "departamentos", "projetos", "cadastro", "lista"]) {
    if (Array.isArray(payload[key])) return payload[key].length;
  }
  for (const key of ["total_de_registros", "total_registros", "registros"]) {
    const value = Number(payload[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function listPayload(sampleSize) {
  return { pagina: 1, registros_por_pagina: sampleSize, apenas_importado_api: "N" };
}

async function testSynchronization(accessContext) {
  const scope = runtimeScope(accessContext);
  const state = await model().findOne(scopeFilter(scope));
  if (!state) throw appError("BOOTSTRAP_REQUIRED", "Salve a configuração antes de testar.", 409);
  const correlationId = `cad_test_${crypto.randomUUID()}`;
  const results = [];

  for (const entity of state.entities) {
    const definition = ENTITY_DEFINITIONS[entity];
    if (!canRun(accessContext, entity)) {
      results.push({ entity, label: definition.label, ok: false, code: "PERMISSION_DENIED", message: "Sem permissão para testar este cadastro." });
      continue;
    }
    const startedAt = Date.now();
    const adapter = createRegistrationAdapter({
      resolveExecutionContext: ({ operationId }) => resolveExecutionContext({ scope, state, operationId, correlationId }),
      transport: omieHttpTransport,
    });
    try {
      const response = await adapter.execute({
        context: { tenantId: scope.tenantId, appInstanceId: scope.appInstanceId, environment: scope.environment, actorId: scope.actorId, correlationId },
        omieConnectionId: state.connectionId,
        operationId: definition.operationId,
        payload: listPayload(state.sampleSize),
      });
      results.push({ entity, label: definition.label, ok: true, count: countProviderRecords(response), durationMs: Date.now() - startedAt });
    } catch (error) {
      results.push({ entity, label: definition.label, ok: false, code: error.code || "TEST_FAILED", message: error.statusCode && error.statusCode < 500 ? error.message : "Não foi possível testar este cadastro.", durationMs: Date.now() - startedAt });
    }
  }

  const successCount = results.filter((result) => result.ok).length;
  const outcome = successCount === results.length ? "success" : successCount ? "partial" : "failure";
  const summary = `${successCount}/${results.length} cadastros validados`;
  await model().updateOne(scopeFilter(scope), { $set: { lastTestAt: new Date(), lastTestOutcome: outcome, lastCorrelationId: correlationId, lastTestSummary: summary } });
  return { ok: outcome === "success", outcome, correlationId, summary, results, bootstrap: await describeBootstrap(accessContext) };
}

module.exports = { ENTITY_DEFINITIONS, countProviderRecords, describeBootstrap, runtimeRequirements, saveBootstrap, testSynchronization };
