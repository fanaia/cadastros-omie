const crypto = require("node:crypto");
const { registry } = require("@oondemand/oon-core-back");
const { createRegistrationAdapter } = require("../integrations/erp/adapter");
const { toCategoryProjection, toDepartmentProjection, toPartnerProjection, toProjectProjection } = require("../integrations/erp/mappers");
const { signExecutionRequest } = require("./executionSignature");
const { omieHttpTransport, postJson } = require("./httpTransport");
const { runtimeScope } = require("./runtimeScope");

const ENTITY_DEFINITIONS = Object.freeze({
  partners: { label: "Clientes e fornecedores", operationId: "partner.list", permission: "cadastros.partner.sync.connection", model: "PartnerProjection", arrayKeys: ["clientes_cadastro"], mapper: toPartnerProjection },
  categories: { label: "Categorias", operationId: "category.list", permission: "cadastros.category.sync.connection", model: "CategoryProjection", arrayKeys: ["categoria_cadastro", "categorias"], mapper: toCategoryProjection },
  departments: { label: "Departamentos", operationId: "department.list", permission: "cadastros.department.sync.connection", model: "DepartmentProjection", arrayKeys: ["departamentos"], mapper: toDepartmentProjection },
  projects: { label: "Projetos", operationId: "project.list", permission: "cadastros.project.sync.connection", model: "ProjectProjection", arrayKeys: ["cadastro", "projetos"], mapper: toProjectProjection },
});

function appError(code, message, statusCode = 400) { const error = new Error(message); error.code = code; error.statusCode = statusCode; return error; }
function requiredText(value, field, maxLength = 200) { const text = String(value || "").trim(); if (!text) throw appError("INVALID_INPUT", `${field} é obrigatório.`); if (text.length > maxLength) throw appError("INVALID_INPUT", `${field} excede o limite permitido.`); return text; }
function mongo(name) { const entry = registry.getModel(name); if (!entry) throw appError("MODEL_NOT_READY", `Modelo ${name} indisponível.`, 503); return entry.mongooseModel; }
function scopeFilter(scope) { return { tenantId: scope.tenantId, appInstanceId: scope.appInstanceId, environment: scope.environment }; }
function normalizedServiceUrl() { const value = requiredText(process.env.OMIE_CONFIG_SERVICE_URL, "OMIE_CONFIG_SERVICE_URL", 500).replace(/\/+$/, ""); let parsed; try { parsed = new URL(value); } catch { throw appError("INVALID_SERVICE_URL", "A URL do app Configurações é inválida.", 503); } const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname); if (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "development" && local)) throw appError("INVALID_SERVICE_URL", "A URL do app Configurações deve usar HTTPS.", 503); return parsed.toString().replace(/\/$/, ""); }
function runtimeRequirements(identityReady = false) { return [
  { name: "OMIE_CONFIG_SERVICE_URL", configured: Boolean(process.env.OMIE_CONFIG_SERVICE_URL), detail: "Localiza o backend do app Configurações." },
  { name: "OMIE_CONFIG_RESOLVER_SHARED_SECRET", configured: Boolean(process.env.OMIE_CONFIG_RESOLVER_SHARED_SECRET), detail: "Assina a resolução efêmera de conexão." },
  { name: "OMIE_CONFIG_APP_INSTANCE_ID", configured: Boolean(process.env.OMIE_CONFIG_APP_INSTANCE_ID), detail: "Seleciona a instância autorizada de Configurações." },
  { name: "Identidade operacional OonCore", configured: identityReady, detail: "Isola o deployment/instância ativado sem configuração manual." },
  { name: "APP_ENVIRONMENT", configured: Boolean(process.env.APP_ENVIRONMENT), detail: "Isola o ambiente de execução." },
]; }
function normalizeEntities(values) { const selected = [...new Set((Array.isArray(values) ? values : []).map(String))]; if (!selected.length || selected.some(value => !ENTITY_DEFINITIONS[value])) throw appError("INVALID_ENTITIES", "Selecione ao menos um cadastro válido."); return selected; }
function canRun(accessContext, entity) { const permissions = accessContext.permissions || []; return permissions.includes("*") || permissions.includes(ENTITY_DEFINITIONS[entity].permission); }

async function resolveExecutionContext({ scope, connectionId, operationId, correlationId }) {
  const body = { tenantId: scope.tenantId, requesterAppInstanceId: scope.appInstanceId, configurationAppInstanceId: requiredText(process.env.OMIE_CONFIG_APP_INSTANCE_ID, "OMIE_CONFIG_APP_INSTANCE_ID", 160), environment: requiredText(process.env.OMIE_CONFIG_ENVIRONMENT || scope.environment, "OMIE_CONFIG_ENVIRONMENT", 80), actorId: scope.actorId, connectionId, operationId, correlationId };
  const timestamp = Date.now(); const clientId = "cadastros-omie";
  return postJson(`${normalizedServiceUrl()}/api/omie-config/execution-context`, { body, timeoutMs: 10000, headers: { "x-omie-config-client": clientId, "x-omie-config-timestamp": String(timestamp), "x-omie-config-signature": signExecutionRequest(process.env.OMIE_CONFIG_RESOLVER_SHARED_SECRET, body, timestamp, clientId) } });
}
function adapterFor(scope, connectionId, correlationId) { return createRegistrationAdapter({ resolveExecutionContext: ({ operationId }) => resolveExecutionContext({ scope, connectionId, operationId, correlationId }), transport: omieHttpTransport }); }
function records(payload, definition) { for (const key of definition.arrayKeys) if (Array.isArray(payload?.[key])) return payload[key]; return []; }
function totalPages(payload) { return Math.max(1, Number(payload?.total_de_paginas || payload?.total_paginas || 1)); }
function countProviderRecords(payload = {}) { for (const definition of Object.values(ENTITY_DEFINITIONS)) { const found = records(payload, definition); if (found.length) return found.length; } return Number(payload.total_de_registros || payload.total_registros || 0); }
function listPayload(page, pageSize) { return { pagina: page, registros_por_pagina: pageSize, apenas_importado_api: "N" }; }

async function listConnections(accessContext) {
  const scope = await runtimeScope(accessContext); const rows = await mongo("RegistrationBootstrapState").find(scopeFilter(scope)).sort({ connectionId: 1 }).lean();
  return { items: rows.map(row => ({ connectionId: row.connectionId, entities: row.entities, sampleSize: row.sampleSize, lastSyncAt: row.lastTestAt, lastSyncOutcome: row.lastTestOutcome, lastSyncSummary: row.lastTestSummary })) };
}
async function describeBootstrap(accessContext) { let identityReady = false; let items = []; try { items = (await listConnections(accessContext)).items; identityReady = true; } catch { /* runtime prerequisites are reported below */ } const requirements = runtimeRequirements(identityReady); return { requirements, ready: requirements.every(item => item.configured) && items.some(item => item.lastSyncOutcome === "success"), configurations: items, configuration: items[0] || null, availableEntities: Object.entries(ENTITY_DEFINITIONS).map(([id, definition]) => ({ id, label: definition.label })) }; }
async function saveBootstrap(accessContext, input = {}) { const scope = await runtimeScope(accessContext); const connectionId = requiredText(input.connectionId, "connectionId", 160); const entities = normalizeEntities(input.entities); const sampleSize = Number(input.sampleSize || 50); if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100) throw appError("INVALID_SAMPLE_SIZE", "O lote deve conter de 1 a 100 registros."); await mongo("RegistrationBootstrapState").findOneAndUpdate({ ...scopeFilter(scope), connectionId }, { $set: { entities, sampleSize }, $setOnInsert: { lastTestOutcome: "not_tested" } }, { upsert: true, new: true, runValidators: true }); return describeBootstrap(accessContext); }

async function syncConnection(accessContext, connectionIdInput) {
  const scope = await runtimeScope(accessContext); const connectionId = requiredText(connectionIdInput, "connectionId", 160); const state = await mongo("RegistrationBootstrapState").findOne({ ...scopeFilter(scope), connectionId }); if (!state) throw appError("BOOTSTRAP_REQUIRED", "Configure esta base antes de sincronizar.", 409);
  const correlationId = `cad_sync_${crypto.randomUUID()}`; const result = [];
  for (const entity of state.entities) {
    const definition = ENTITY_DEFINITIONS[entity]; if (!canRun(accessContext, entity)) { result.push({ entity, ok: false, code: "PERMISSION_DENIED", count: 0 }); continue; }
    let page = 1; let pages = 1; let count = 0;
    try {
      do { const payload = await adapterFor(scope, connectionId, correlationId).execute({ context: { ...scope, correlationId }, omieConnectionId: connectionId, operationId: definition.operationId, payload: listPayload(page, state.sampleSize) }); pages = Math.min(totalPages(payload), 1000); for (const source of records(payload, definition)) { const projection = definition.mapper(source, connectionId); if (!projection.externalId || !(projection.legalName || projection.name || projection.description)) continue; await mongo(definition.model).findOneAndUpdate({ tenantId: scope.tenantId, omieConnectionId: connectionId, externalId: String(projection.externalId) }, { $set: projection }, { upsert: true, runValidators: true }); count += 1; } page += 1; } while (page <= pages);
      result.push({ entity, ok: true, count });
    } catch (error) { result.push({ entity, ok: false, count, code: error.code || "SYNC_FAILED" }); }
  }
  const succeeded = result.filter(item => item.ok).length; const outcome = succeeded === result.length ? "success" : succeeded ? "partial" : "failure"; const summary = `${succeeded}/${result.length} tipos sincronizados • ${result.reduce((sum, item) => sum + item.count, 0)} registros`;
  await mongo("RegistrationBootstrapState").updateOne({ ...scopeFilter(scope), connectionId }, { $set: { lastTestAt: new Date(), lastTestOutcome: outcome, lastCorrelationId: correlationId, lastTestSummary: summary } });
  return { ok: outcome === "success", outcome, summary, correlationId, results: result };
}
async function testSynchronization(accessContext, input = {}) { return syncConnection(accessContext, input.connectionId || (await listConnections(accessContext)).items[0]?.connectionId); }

async function listEntities(accessContext, entity, query = {}) {
  const definition = ENTITY_DEFINITIONS[entity]; if (!definition) throw appError("UNKNOWN_ENTITY", "Tipo de cadastro inválido."); const scope = await runtimeScope(accessContext); const connectionId = requiredText(query.connectionId, "connectionId", 160); const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 50))); const filter = { tenantId: scope.tenantId, omieConnectionId: connectionId }; const term = String(query.query || "").trim(); if (term) filter.$or = ["legalName", "tradeName", "documentMasked", "email", "name", "description"].map(field => ({ [field]: { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } })); const model = mongo(definition.model); const [items, total] = await Promise.all([model.find(filter).sort({ legalName: 1, name: 1, description: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), model.countDocuments(filter)]); return { items, total, page, pageSize };
}
async function overview(accessContext) { const scope = await runtimeScope(accessContext); const totals = {}; for (const [entity, definition] of Object.entries(ENTITY_DEFINITIONS)) totals[entity] = await mongo(definition.model).countDocuments({ tenantId: scope.tenantId }); totals.errors = 0; return { totals, connections: (await listConnections(accessContext)).items, recentErrors: [] }; }

async function executeIdempotent(accessContext, input, idempotencyKey, operationId, providerPayload, mapper, modelName) {
  const scope = await runtimeScope(accessContext); const connectionId = requiredText(input.connectionId, "connectionId", 160); const key = requiredText(idempotencyKey, "Idempotency-Key", 160); const Command = mongo("RegistrationCommand"); const filter = { ...scopeFilter(scope), connectionId, idempotencyKey: key }; const previous = await Command.findOne(filter).lean(); if (previous?.outcome === "success") return previous.response; if (previous?.outcome === "processing") throw appError("COMMAND_IN_PROGRESS", "Esta operação já está em processamento.", 409); await Command.findOneAndUpdate(filter, { $set: { operationId, outcome: "processing" } }, { upsert: true }); const correlationId = `cad_cmd_${crypto.randomUUID()}`;
  try { const provider = await adapterFor(scope, connectionId, correlationId).execute({ context: { ...scope, correlationId }, omieConnectionId: connectionId, operationId, payload: providerPayload }); const projection = mapper({ ...providerPayload, ...provider }, connectionId); if (projection.externalId) await mongo(modelName).findOneAndUpdate({ tenantId: scope.tenantId, omieConnectionId: connectionId, externalId: String(projection.externalId) }, { $set: projection }, { upsert: true, runValidators: true }); const response = { ok: true, projection, providerCode: provider.codigo_status || null, correlationId }; await Command.updateOne(filter, { $set: { outcome: "success", response } }); return response; } catch (error) { await Command.updateOne(filter, { $set: { outcome: "failure", errorCode: error.code || "COMMAND_FAILED" } }); throw error; }
}
async function upsertPartner(accessContext, input, key) { const integrationCode = input.integrationCode || `oon-${crypto.randomUUID()}`; const payload = { codigo_cliente_integracao: integrationCode, razao_social: requiredText(input.legalName, "legalName", 60), nome_fantasia: String(input.tradeName || "").trim(), cnpj_cpf: String(input.document || "").replace(/\D/g, ""), email: String(input.email || "").trim(), telefone1_numero: String(input.phone || "").trim(), cliente: input.isCustomer === false ? "N" : "S", fornecedor: input.isSupplier ? "S" : "N" }; return executeIdempotent(accessContext, input, key, "partner.upsert", payload, toPartnerProjection, "PartnerProjection"); }
async function upsertProject(accessContext, input, key) { const payload = { codInt: input.integrationCode || `oon-${crypto.randomUUID()}`, nome: requiredText(input.name, "name", 70), inativo: input.active === false ? "S" : "N" }; return executeIdempotent(accessContext, input, key, "project.upsert", payload, toProjectProjection, "ProjectProjection"); }

module.exports = { ENTITY_DEFINITIONS, countProviderRecords, describeBootstrap, listConnections, listEntities, overview, runtimeRequirements, saveBootstrap, syncConnection, testSynchronization, upsertPartner, upsertProject };
