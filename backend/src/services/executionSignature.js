const crypto = require("node:crypto");

function canonicalExecutionRequest(body = {}, timestamp, clientId) {
  return [
    String(timestamp || ""),
    String(clientId || ""),
    String(body.tenantId || ""),
    String(body.requesterAppInstanceId || ""),
    String(body.configurationAppInstanceId || ""),
    String(body.environment || ""),
    String(body.actorId || ""),
    String(body.connectionId || ""),
    String(body.operationId || ""),
    String(body.correlationId || ""),
  ].join("\n");
}

function signExecutionRequest(secret, body, timestamp, clientId) {
  if (!secret) {
    const error = new Error("Assinatura de serviço não configurada.");
    error.code = "SERVICE_SIGNATURE_NOT_CONFIGURED";
    error.statusCode = 503;
    throw error;
  }
  return crypto.createHmac("sha256", secret).update(canonicalExecutionRequest(body, timestamp, clientId), "utf8").digest("hex");
}

module.exports = { canonicalExecutionRequest, signExecutionRequest };
