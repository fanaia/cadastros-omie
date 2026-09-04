const { registry } = require("@oondemand/oon-core-back");
const { decryptBinding, encryptBinding, resolveBindingKey } = require("./bindingVault");
const { runtimeScope } = require("./runtimeScope");

const SYNC_POLICY_CONTRACT_VERSION = 1;

function appError(code, message, statusCode = 400) { const error = new Error(message); error.code = code; error.statusCode = statusCode; return error; }
function requiredText(value, field, max = 600) { const text = String(value || "").trim(); if (!text) throw appError("INVALID_INPUT", field + " é obrigatório."); if (text.length > max) throw appError("INVALID_INPUT", field + " excede o limite."); return text; }
function model() { const entry = registry.getModel("OmieResolverBinding"); if (!entry) throw appError("MODEL_NOT_READY", "Modelo de vínculo indisponível.", 503); return entry.mongooseModel; }
function scopeFilter(value) { return { tenantId: value.tenantId, appInstanceId: value.appInstanceId, environment: value.environment }; }
function normalizeProviderUrl(value) {
  let parsed;
  try { parsed = new URL(requiredText(value, "providerUrl", 500)); } catch { throw appError("INVALID_PROVIDER_URL", "A URL do módulo Configurações é inválida."); }
  const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(process.env.NODE_ENV === "development" && local)) throw appError("INVALID_PROVIDER_URL", "A URL do módulo Configurações deve usar HTTPS.");
  return parsed.toString().replace(/\/$/, "");
}
function parsePairing(value) {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(requiredText(value, "pairingCode", 5000)); }
  catch { throw appError("INVALID_PAIRING_CODE", "O código de vínculo não é um JSON válido."); }
}
function validatePairing(input, environment) {
  const pairing = parsePairing(input);
  if (pairing.schemaVersion !== 1) throw appError("UNSUPPORTED_PAIRING_VERSION", "A versão do código de vínculo não é suportada.");
  if (pairing.syncPolicyContractVersion !== SYNC_POLICY_CONTRACT_VERSION) throw appError("UNSUPPORTED_SYNC_POLICY_CONTRACT", "O vínculo não declara uma versão compatível do contrato de sincronização.", 409);
  if (pairing.consumerAppCode !== "cadastros-omie") throw appError("PAIRING_CONSUMER_MISMATCH", "Este código não pertence ao módulo Cadastros Omie.", 409);
  if (requiredText(pairing.environment, "environment", 80) !== environment) throw appError("PAIRING_ENVIRONMENT_MISMATCH", "O vínculo pertence a outro ambiente.", 409);
  const secret = requiredText(pairing.secret, "secret", 300);
  if (secret.length < 32) throw appError("PAIRING_SECRET_WEAK", "O segredo do vínculo é inválido.");
  return {
    connectionId: requiredText(pairing.connectionId, "connectionId", 160),
    providerUrl: normalizeProviderUrl(pairing.providerUrl),
    providerAppInstanceId: requiredText(pairing.providerAppInstanceId, "providerAppInstanceId", 160),
    grantId: requiredText(pairing.grantId, "grantId", 160),
    secret,
  };
}
function serialize(row) { return { connectionId: row.connectionId, providerUrl: row.providerUrl, providerAppInstanceId: row.providerAppInstanceId, grantId: row.grantId, rotatedAt: row.rotatedAt }; }
async function saveResolverBinding(accessContext, input = {}) {
  const scope = await runtimeScope(accessContext);
  resolveBindingKey();
  const pairing = validatePairing(input.pairingCode || input.pairing, scope.environment);
  const row = await model().findOneAndUpdate(
    { ...scopeFilter(scope), connectionId: pairing.connectionId },
    { $set: { providerUrl: pairing.providerUrl, providerAppInstanceId: pairing.providerAppInstanceId, grantId: pairing.grantId, encryptedSecret: encryptBinding({ secret: pairing.secret }), rotatedAt: new Date() } },
    { upsert: true, new: true, runValidators: true },
  );
  return { message: "Módulo Configurações vinculado com segurança.", binding: serialize(row) };
}
async function listResolverBindings(accessContext) {
  const scope = await runtimeScope(accessContext);
  const rows = await model().find(scopeFilter(scope)).sort({ connectionId: 1 }).lean();
  return { items: rows.map(serialize) };
}
async function hasResolverBinding(scope, connectionId) {
  return Boolean(await model().exists({ ...scopeFilter(scope), connectionId }));
}
async function resolverBindingFor(scope, connectionId) {
  const row = await model().findOne({ ...scopeFilter(scope), connectionId }).select("+encryptedSecret").lean();
  if (!row) return null;
  return { ...serialize(row), secret: decryptBinding(row.encryptedSecret).secret };
}

module.exports = { SYNC_POLICY_CONTRACT_VERSION, hasResolverBinding, listResolverBindings, resolverBindingFor, saveResolverBinding, validatePairing };
