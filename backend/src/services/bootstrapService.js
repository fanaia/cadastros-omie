const crypto = require("node:crypto");
const { registry } = require("@oondemand/oon-core-back");
const { createRegistrationAdapter } = require("../integrations/erp/adapter");
const { toCategoryProjection, toDepartmentProjection, toPartnerProjection, toProjectProjection } = require("../integrations/erp/mappers");
const { signExecutionRequest } = require("./executionSignature");
const { omieHttpTransport, postJson } = require("./httpTransport");
const { runtimeScope } = require("./runtimeScope");
const { hasResolverBinding, resolverBindingFor } = require("./resolverBindingService");
const { resolveBindingKey } = require("./bindingVault");

const ENTITY_DEFINITIONS = Object.freeze({
  partners: { label: "Clientes e fornecedores", operationId: "partner.list", permission: "cadastros.partner.sync.connection", model: "PartnerProjection", arrayKeys: ["clientes_cadastro"], mapper: toPartnerProjection },
  categories: { label: "Categorias", operationId: "category.list", permission: "cadastros.category.sync.connection", model: "CategoryProjection", arrayKeys: ["categoria_cadastro", "categorias"], mapper: toCategoryProjection },
  departments: { label: "Departamentos", operationId: "department.list", permission: "cadastros.department.sync.connection", model: "DepartmentProjection", arrayKeys: ["departamentos"], mapper: toDepartmentProjection },
  projects: { label: "Projetos", operationId: "project.list", permission: "cadastros.project.sync.connection", model: "ProjectProjection", arrayKeys: ["cadastro", "projetos"], mapper: toProjectProjection },
});
const SYNC_LEASE_MS = 5 * 60 * 1000;

function appError(code, message, statusCode = 400) { const error = new Error(message); error.code = code; error.statusCode = statusCode; return error; }
function requiredText(value, field, maxLength = 200) { const text = String(value || "").trim(); if (!text) throw appError("INVALID_INPUT", `${field} é obrigatório.`); if (text.length > maxLength) throw appError("INVALID_INPUT", `${field} excede o limite permitido.`); return text; }
function mongo(name) { const entry = registry.getModel(name); if (!entry) throw appError("MODEL_NOT_READY", `Modelo ${name} indisponível.`, 503); return entry.mongooseModel; }
function scopeFilter(scope) { return { tenantId: scope.tenantId, appInstanceId: scope.appInstanceId, environment: scope.environment }; }
function normalizedServiceUrl() { const value = requiredText(process.env.OMIE_CONFIG_SERVICE_URL, "OMIE_CONFIG_SERVICE_URL", 500).replace(/\/+$/, ""); let parsed; try { parsed = new URL(value); } catch { throw appError("INVALID_SERVICE_URL", "A URL do app Configurações é inválida.", 503); } const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname); if (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "development" && local)) throw appError("INVALID_SERVICE_URL", "A URL do app Configurações deve usar HTTPS.", 503); return parsed.toString().replace(/\/$/, ""); }
function bindingProtectionReady() { try { resolveBindingKey(); return true; } catch { return false; } }
function runtimeRequirements(identityReady = false, bindingReady = false) { return [
  { name: "Vínculo com Configurações Omie", configured: bindingReady, detail: "Autoriza esta base no módulo Configurações sem variáveis manuais." },
  { name: "Proteção do vínculo OonCore", configured: bindingProtectionReady(), detail: "Cifra o segredo técnico deste módulo em repouso." },
  { name: "Identidade operacional OonCore", configured: identityReady, detail: "Isola o deployment/instância ativado sem configuração manual." },
  { name: "APP_ENVIRONMENT", configured: Boolean(process.env.APP_ENVIRONMENT), detail: "Isola o ambiente de execução." },
]; }
function normalizeEntities(values) { const selected = [...new Set((Array.isArray(values) ? values : []).map(String))]; if (!selected.length || selected.some(value => !ENTITY_DEFINITIONS[value])) throw appError("INVALID_ENTITIES", "Selecione ao menos um cadastro válido."); return selected; }
function canRun(accessContext, entity) { const permissions = accessContext.permissions || []; return permissions.includes("*") || permissions.includes(ENTITY_DEFINITIONS[entity].permission); }
function normalizeEntitySelection(configured, requested) {
  const selected = requested === undefined ? [...configured] : normalizeEntities(requested);
  if (selected.some(entity => !configured.includes(entity))) {
    throw appError("ENTITY_NOT_CONFIGURED", "A seleção contém um cadastro não configurado para esta base.", 409);
  }
  return selected;
}
function retryableEntities(results = []) {
  return [...new Set(results.filter(item => item && !item.ok && ENTITY_DEFINITIONS[item.entity]).map(item => item.entity))];
}
function outcomeForResults(results) {
  const succeeded = results.filter(item => item.ok).length;
  return succeeded === results.length && results.length ? "success" : succeeded ? "partial" : "failure";
}
function summarizeResults(results) {
  const succeeded = results.filter(item => item.ok).length;
  return {
    outcome: outcomeForResults(results),
    summary: `${succeeded}/${results.length} tipos sincronizados • ${results.reduce((sum, item) => sum + Number(item.count || 0), 0)} registros`,
  };
}
function mergeEntityResults(configured, previous = [], current = []) {
  const byEntity = new Map(previous.map(item => [item.entity, item]));
  for (const item of current) byEntity.set(item.entity, item);
  return configured.map(entity => byEntity.get(entity) || { entity, ok: false, count: 0, code: "NOT_RUN" });
}

async function resolveExecutionContext({ scope, connectionId, operationId, correlationId }) {
  const binding = await resolverBindingFor(scope, connectionId);
  const providerUrl = binding?.providerUrl || normalizedServiceUrl();
  const providerAppInstanceId = binding?.providerAppInstanceId || requiredText(process.env.OMIE_CONFIG_APP_INSTANCE_ID, "OMIE_CONFIG_APP_INSTANCE_ID", 160);
  const providerEnvironment = binding ? scope.environment : requiredText(process.env.OMIE_CONFIG_ENVIRONMENT || scope.environment, "OMIE_CONFIG_ENVIRONMENT", 80);
  const signingSecret = binding?.secret || process.env.OMIE_CONFIG_RESOLVER_SHARED_SECRET;
  const body = { tenantId: scope.tenantId, requesterAppInstanceId: scope.appInstanceId, configurationAppInstanceId: providerAppInstanceId, environment: providerEnvironment, actorId: scope.actorId, connectionId, operationId, correlationId };
  const timestamp = Date.now(); const clientId = "cadastros-omie";
  return postJson(`${providerUrl}/api/omie-config/execution-context`, { body, timeoutMs: 10000, headers: { "x-omie-config-client": clientId, "x-omie-config-grant": binding?.grantId || "", "x-omie-config-timestamp": String(timestamp), "x-omie-config-signature": signExecutionRequest(signingSecret, body, timestamp, clientId) } });
}
function adapterFor(scope, connectionId, correlationId) { return createRegistrationAdapter({ resolveExecutionContext: ({ operationId }) => resolveExecutionContext({ scope, connectionId, operationId, correlationId }), transport: omieHttpTransport }); }
function records(payload, definition) { for (const key of definition.arrayKeys) if (Array.isArray(payload?.[key])) return payload[key]; return []; }
function totalPages(payload) { return Math.max(1, Number(payload?.total_de_paginas || payload?.total_paginas || 1)); }
function countProviderRecords(payload = {}) { for (const definition of Object.values(ENTITY_DEFINITIONS)) { const found = records(payload, definition); if (found.length) return found.length; } return Number(payload.total_de_registros || payload.total_registros || 0); }
function listPayload(page, pageSize) { return { pagina: page, registros_por_pagina: pageSize, apenas_importado_api: "N" }; }

async function listConnections(accessContext) {
  const scope = await runtimeScope(accessContext); const rows = await mongo("RegistrationBootstrapState").find(scopeFilter(scope)).sort({ connectionId: 1 }).lean();
  const now = Date.now();
  return { items: await Promise.all(rows.map(async row => ({ connectionId: row.connectionId, entities: row.entities, sampleSize: row.sampleSize, bindingConfigured: await hasResolverBinding(scope, row.connectionId), syncRunning: row.syncStatus === "running" && new Date(row.syncLeaseExpiresAt || 0).getTime() > now, lastSyncAt: row.lastTestAt, lastSyncOutcome: row.lastTestOutcome, lastCorrelationId: row.lastCorrelationId, lastSyncSummary: row.lastTestSummary, lastResults: row.lastResults || [] }))) };
}
function serializeSyncRun(row) {
  return { runId: row.runId, correlationId: row.correlationId, connectionId: row.connectionId, trigger: row.trigger, entities: row.entities, status: row.status, outcome: row.outcome, summary: row.summary, results: row.results || [], errorCode: row.errorCode, startedAt: row.startedAt, completedAt: row.completedAt };
}
async function recentSyncRuns(scope, limit = 12) {
  const rows = await mongo("RegistrationSyncRun").find(scopeFilter(scope)).sort({ startedAt: -1 }).limit(limit).lean();
  return rows.map(serializeSyncRun);
}
async function describeBootstrap(accessContext) {
  let identityReady = false; let items = []; let recentRuns = [];
  try { const scope = await runtimeScope(accessContext); [items, recentRuns] = await Promise.all([(await listConnections(accessContext)).items, recentSyncRuns(scope)]); identityReady = true; } catch { /* runtime prerequisites are reported below */ }
  const requirements = runtimeRequirements(identityReady, items.some(item => item.bindingConfigured));
  return { requirements, ready: requirements.every(item => item.configured) && items.some(item => item.lastSyncOutcome === "success"), configurations: items, configuration: items[0] || null, recentRuns, availableEntities: Object.entries(ENTITY_DEFINITIONS).map(([id, definition]) => ({ id, label: definition.label })) };
}
async function saveBootstrap(accessContext, input = {}) { const scope = await runtimeScope(accessContext); const connectionId = requiredText(input.connectionId, "connectionId", 160); const entities = normalizeEntities(input.entities); const sampleSize = Number(input.sampleSize || 50); if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100) throw appError("INVALID_SAMPLE_SIZE", "O lote deve conter de 1 a 100 registros."); await mongo("RegistrationBootstrapState").findOneAndUpdate({ ...scopeFilter(scope), connectionId }, { $set: { entities, sampleSize }, $setOnInsert: { lastTestOutcome: "not_tested" } }, { upsert: true, new: true, runValidators: true }); return describeBootstrap(accessContext); }

async function acquireSyncLease(scope, connectionId) {
  const now = new Date(); const leaseId = `lease_${crypto.randomUUID()}`;
  const state = await mongo("RegistrationBootstrapState").findOneAndUpdate(
    { ...scopeFilter(scope), connectionId, $or: [{ syncStatus: { $ne: "running" } }, { syncLeaseExpiresAt: { $lte: now } }, { syncLeaseExpiresAt: null }] },
    { $set: { syncStatus: "running", syncLeaseId: leaseId, syncLeaseExpiresAt: new Date(now.getTime() + SYNC_LEASE_MS) } },
    { new: true },
  );
  if (!state) throw appError("SYNC_IN_PROGRESS", "Já existe uma sincronização em andamento para esta base.", 409);
  return { leaseId, state };
}
async function renewSyncLease(scope, connectionId, leaseId) {
  const result = await mongo("RegistrationBootstrapState").updateOne(
    { ...scopeFilter(scope), connectionId, syncStatus: "running", syncLeaseId: leaseId },
    { $set: { syncLeaseExpiresAt: new Date(Date.now() + SYNC_LEASE_MS) } },
  );
  if (!result.matchedCount) throw appError("SYNC_LEASE_LOST", "A exclusividade da sincronização expirou; a execução foi interrompida.", 409);
}
async function releaseSyncLease(scope, connectionId, leaseId) {
  await mongo("RegistrationBootstrapState").updateOne(
    { ...scopeFilter(scope), connectionId, syncLeaseId: leaseId },
    { $set: { syncStatus: "idle" }, $unset: { syncLeaseId: "", syncLeaseExpiresAt: "" } },
  );
}
async function executeSyncEntities({ accessContext, scope, connectionId, state, entities, correlationId, leaseId }) {
  const result = [];
  for (const entity of entities) {
    const definition = ENTITY_DEFINITIONS[entity]; let page = 1; let pages = 1; let count = 0;
    try {
      do {
        await renewSyncLease(scope, connectionId, leaseId);
        const payload = await adapterFor(scope, connectionId, correlationId).execute({ context: { ...scope, correlationId }, omieConnectionId: connectionId, operationId: definition.operationId, payload: listPayload(page, state.sampleSize) });
        pages = Math.min(totalPages(payload), 1000);
        for (const source of records(payload, definition)) {
          const projection = definition.mapper(source, connectionId);
          if (!projection.externalId || !(projection.legalName || projection.name || projection.description)) continue;
          await mongo(definition.model).findOneAndUpdate({ tenantId: scope.tenantId, omieConnectionId: connectionId, externalId: String(projection.externalId) }, { $set: projection }, { upsert: true, runValidators: true });
          count += 1;
        }
        page += 1;
      } while (page <= pages);
      result.push({ entity, ok: true, count });
    } catch (error) {
      if (error.code === "SYNC_LEASE_LOST") throw error;
      result.push({ entity, ok: false, count, code: error.code || "SYNC_FAILED" });
    }
  }
  return result;
}
async function existingSyncResponse(scope, connectionId, idempotencyKey) {
  const row = await mongo("RegistrationSyncRun").findOne({ ...scopeFilter(scope), connectionId, idempotencyKey }).lean();
  if (!row) return null;
  if (row.status === "completed" && row.response) return { ...row.response, idempotent: true };
  if (row.status === "failed") throw appError("SYNC_KEY_ALREADY_FAILED", "Esta chave idempotente pertence a uma execução que falhou; gere uma nova chave.", 409);
  throw appError("SYNC_ALREADY_REQUESTED", "Esta sincronização já foi solicitada e continua em processamento.", 409);
}
async function runSynchronization(accessContext, input = {}, idempotencyKey, trigger = "manual") {
  const scope = await runtimeScope(accessContext); const connectionId = requiredText(input.connectionId, "connectionId", 160); const key = requiredText(idempotencyKey, "Idempotency-Key", 160);
  const State = mongo("RegistrationBootstrapState"); const state = await State.findOne({ ...scopeFilter(scope), connectionId });
  if (!state) throw appError("BOOTSTRAP_REQUIRED", "Configure esta base antes de sincronizar.", 409);
  const previous = await existingSyncResponse(scope, connectionId, key); if (previous) return previous;
  const entities = trigger === "retry" ? retryableEntities(state.lastResults) : normalizeEntitySelection(state.entities, input.entities);
  if (!entities.length) throw appError("NO_FAILED_ENTITIES", "Não há falhas pendentes para reprocessar nesta base.", 409);
  if (entities.some(entity => !canRun(accessContext, entity))) throw appError("PERMISSION_DENIED", "Você não possui permissão para sincronizar todos os cadastros selecionados.", 403);
  const { leaseId } = await acquireSyncLease(scope, connectionId); const runId = `cad_run_${crypto.randomUUID()}`; const correlationId = `cad_sync_${crypto.randomUUID()}`; const Run = mongo("RegistrationSyncRun"); let runCreated = false;
  try {
    await Run.create({ ...scopeFilter(scope), connectionId, runId, idempotencyKey: key, trigger, correlationId, entities, requestedBy: scope.actorId, status: "processing", startedAt: new Date() });
    runCreated = true;
    const results = await executeSyncEntities({ accessContext, scope, connectionId, state, entities, correlationId, leaseId });
    const attempt = summarizeResults(results); const aggregateResults = mergeEntityResults(state.entities, state.lastResults, results); const aggregate = summarizeResults(aggregateResults); const completedAt = new Date();
    const response = { ok: attempt.outcome === "success", outcome: attempt.outcome, summary: attempt.summary, overallOutcome: aggregate.outcome, overallSummary: aggregate.summary, correlationId, runId, trigger, results, aggregateResults };
    await Promise.all([
      State.updateOne({ ...scopeFilter(scope), connectionId }, { $set: { lastTestAt: completedAt, lastTestOutcome: aggregate.outcome, lastCorrelationId: correlationId, lastTestSummary: aggregate.summary, lastResults: aggregateResults } }),
      Run.updateOne({ ...scopeFilter(scope), connectionId, runId }, { $set: { status: "completed", outcome: attempt.outcome, summary: attempt.summary, results, response, completedAt } }),
    ]);
    return response;
  } catch (error) {
    if (error.code === 11000 && !runCreated) return existingSyncResponse(scope, connectionId, key);
    await Run.updateOne({ ...scopeFilter(scope), connectionId, runId }, { $set: { status: "failed", errorCode: error.code || "SYNC_FAILED", completedAt: new Date() } });
    throw error;
  } finally { await releaseSyncLease(scope, connectionId, leaseId); }
}
async function syncConnection(accessContext, input = {}, idempotencyKey) { return runSynchronization(accessContext, typeof input === "string" ? { connectionId: input } : input, idempotencyKey, "manual"); }
async function retryFailedSynchronization(accessContext, input = {}, idempotencyKey) { return runSynchronization(accessContext, input, idempotencyKey, "retry"); }
async function testSynchronization(accessContext, input = {}, idempotencyKey) { return runSynchronization(accessContext, { ...input, connectionId: input.connectionId || (await listConnections(accessContext)).items[0]?.connectionId }, idempotencyKey || `test-${crypto.randomUUID()}`, "test"); }
async function listSyncRuns(accessContext, query = {}) { const scope = await runtimeScope(accessContext); const connectionId = requiredText(query.connectionId, "connectionId", 160); const limit = Math.min(50, Math.max(1, Number(query.limit || 20))); const rows = await mongo("RegistrationSyncRun").find({ ...scopeFilter(scope), connectionId }).sort({ startedAt: -1 }).limit(limit).lean(); return { items: rows.map(serializeSyncRun) }; }

async function listEntities(accessContext, entity, query = {}) {
  const definition = ENTITY_DEFINITIONS[entity]; if (!definition) throw appError("UNKNOWN_ENTITY", "Tipo de cadastro inválido."); const scope = await runtimeScope(accessContext); const connectionId = requiredText(query.connectionId, "connectionId", 160); const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 50))); const filter = { tenantId: scope.tenantId, omieConnectionId: connectionId }; const term = String(query.query || "").trim(); if (term) filter.$or = ["legalName", "tradeName", "documentMasked", "email", "name", "description"].map(field => ({ [field]: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })); const model = mongo(definition.model); const [items, total] = await Promise.all([model.find(filter).sort({ legalName: 1, name: 1, description: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), model.countDocuments(filter)]); return { items, total, page, pageSize };
}
async function overview(accessContext) { const scope = await runtimeScope(accessContext); const totals = {}; for (const [entity, definition] of Object.entries(ENTITY_DEFINITIONS)) totals[entity] = await mongo(definition.model).countDocuments({ tenantId: scope.tenantId }); const connections = (await listConnections(accessContext)).items; const recentErrors = connections.flatMap(row => (row.lastResults || []).filter(item => !item.ok).map(item => ({ entity: item.entity, name: ENTITY_DEFINITIONS[item.entity]?.label || item.entity, connectionId: row.connectionId, code: item.code, correlationId: row.lastCorrelationId }))); totals.errors = recentErrors.length; return { totals, connections, recentErrors }; }

async function executeIdempotent(accessContext, input, idempotencyKey, operationId, providerPayload, mapper, modelName) {
  const scope = await runtimeScope(accessContext); const connectionId = requiredText(input.connectionId, "connectionId", 160); const key = requiredText(idempotencyKey, "Idempotency-Key", 160); const Command = mongo("RegistrationCommand"); const filter = { ...scopeFilter(scope), connectionId, idempotencyKey: key }; const previous = await Command.findOne(filter).lean(); if (previous?.outcome === "success") return previous.response; if (previous?.outcome === "processing") throw appError("COMMAND_IN_PROGRESS", "Esta operação já está em processamento.", 409); await Command.findOneAndUpdate(filter, { $set: { operationId, outcome: "processing" } }, { upsert: true }); const correlationId = `cad_cmd_${crypto.randomUUID()}`;
  try { const provider = await adapterFor(scope, connectionId, correlationId).execute({ context: { ...scope, correlationId }, omieConnectionId: connectionId, operationId, payload: providerPayload }); const projection = mapper({ ...providerPayload, ...provider }, connectionId); if (projection.externalId) await mongo(modelName).findOneAndUpdate({ tenantId: scope.tenantId, omieConnectionId: connectionId, externalId: String(projection.externalId) }, { $set: projection }, { upsert: true, runValidators: true }); const response = { ok: true, projection, providerCode: provider.codigo_status || null, correlationId }; await Command.updateOne(filter, { $set: { outcome: "success", response } }); return response; } catch (error) { await Command.updateOne(filter, { $set: { outcome: "failure", errorCode: error.code || "COMMAND_FAILED" } }); throw error; }
}
async function upsertPartner(accessContext, input, key) { const integrationCode = input.integrationCode || `oon-${crypto.randomUUID()}`; const payload = { codigo_cliente_integracao: integrationCode, razao_social: requiredText(input.legalName, "legalName", 60), nome_fantasia: String(input.tradeName || "").trim(), cnpj_cpf: String(input.document || "").replace(/\D/g, ""), email: String(input.email || "").trim(), telefone1_numero: String(input.phone || "").trim(), cliente: input.isCustomer === false ? "N" : "S", fornecedor: input.isSupplier ? "S" : "N" }; return executeIdempotent(accessContext, input, key, "partner.upsert", payload, toPartnerProjection, "PartnerProjection"); }
async function upsertProject(accessContext, input, key) { const payload = { codInt: input.integrationCode || `oon-${crypto.randomUUID()}`, nome: requiredText(input.name, "name", 70), inativo: input.active === false ? "S" : "N" }; return executeIdempotent(accessContext, input, key, "project.upsert", payload, toProjectProjection, "ProjectProjection"); }

module.exports = { ENTITY_DEFINITIONS, countProviderRecords, describeBootstrap, listConnections, listEntities, listSyncRuns, mergeEntityResults, normalizeEntitySelection, outcomeForResults, overview, retryableEntities, retryFailedSynchronization, runtimeRequirements, saveBootstrap, summarizeResults, syncConnection, testSynchronization, upsertPartner, upsertProject };
