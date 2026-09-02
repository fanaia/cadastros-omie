const { operationalRequestHeaders } = require("@oondemand/oon-core-back");

function appError(code, message, statusCode = 503) { const error = new Error(message); error.code = code; error.statusCode = statusCode; return error; }
function required(value, field, max = 200) { const text = String(value || "").trim(); if (!text) throw appError("INVALID_INPUT", `${field} é obrigatório.`, 400); if (text.length > max) throw appError("INVALID_INPUT", `${field} excede o limite.`, 400); return text; }

async function resolveOperationalIdentity(access = {}, dependencies = {}) {
  const legacyId = String(process.env.APP_INSTANCE_ID || "").trim();
  if (legacyId) return legacyId;
  const tenantId = required(access.tenantId, "tenantId", 160);
  const appCode = String(access.appCode || process.env.APP_CODE || "cadastros-omie").trim().toLowerCase();
  if (process.env.NODE_ENV === "development" && process.env.OON_RUNTIME_MODE === "local") return `local:${appCode}:${tenantId}`;
  try {
    const headers = await (dependencies.operationalRequestHeaders || operationalRequestHeaders)({ tenantId });
    const identity = headers?.["x-oon-deployment-id"] || headers?.["x-oon-instance-id"];
    if (identity) return required(identity, "identidade operacional", 160);
  } catch (cause) {
    throw appError("OON_OPERATIONAL_IDENTITY_REQUIRED", "A identidade operacional do OonCore ainda não está disponível. Reative a publicação em Dev.", cause?.statusCode === 403 ? 403 : 503);
  }
  throw appError("OON_OPERATIONAL_IDENTITY_REQUIRED", "A identidade operacional do OonCore ainda não está disponível. Reative a publicação em Dev.");
}

async function runtimeScope(access = {}, dependencies = {}) {
  const tenantId = required(access.tenantId, "tenantId", 160);
  return { tenantId, actorId: required(access.userId, "actorId", 160), appInstanceId: await resolveOperationalIdentity({ ...access, tenantId }, dependencies), environment: required(process.env.APP_ENVIRONMENT, "APP_ENVIRONMENT", 80) };
}

module.exports = { resolveOperationalIdentity, runtimeScope };
