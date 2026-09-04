const { getOperation } = require("./operations");

const REQUIRED_CONTEXT = ["tenantId", "appInstanceId", "environment", "actorId"];
const SYNC_POLICY_CONTRACT_VERSION = 1;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertContext(context) {
  for (const field of REQUIRED_CONTEXT) {
    if (!context?.[field]) throw fail("INVALID_EXECUTION_CONTEXT", `Contexto sem ${field}`);
  }
}

function applySyncPolicy(operationId, payload, policy) {
  if (!operationId.endsWith(".list")) return payload;
  if (!policy || policy.contractVersion !== SYNC_POLICY_CONTRACT_VERSION) {
    throw fail("SYNC_POLICY_REQUIRED", "Contrato de sincronização ausente ou incompatível");
  }
  if (policy.status !== "active") {
    throw fail("SYNC_POLICY_PAUSED", "A sincronização está pausada no Control Plane");
  }
  const pageSize = Number(policy.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw fail("SYNC_POLICY_INVALID", "Registros por página inválido no Control Plane");
  }
  return { ...payload, registros_por_pagina: pageSize };
}

function createRegistrationAdapter({ resolveExecutionContext, transport, audit = async () => {} }) {
  if (typeof resolveExecutionContext !== "function" || typeof transport !== "function") {
    throw new TypeError("resolveExecutionContext e transport são obrigatórios");
  }

  return Object.freeze({
    async execute({ context, omieConnectionId, operationId, payload = {} }) {
      assertContext(context);
      if (!omieConnectionId) throw fail("CONNECTION_REQUIRED", "omieConnectionId é obrigatório");
      const operation = getOperation(operationId);
      const execution = await resolveExecutionContext({ context, connectionId: omieConnectionId, operationId });
      if (!execution?.allowed || execution.status !== "active") {
        throw fail("CONNECTION_NOT_AUTHORIZED", "Conexão indisponível ou não autorizada");
      }
      if (!execution.credential?.key || !execution.credential?.secret) {
        throw fail("CREDENTIAL_UNAVAILABLE", "Material efêmero de execução indisponível");
      }
      const effectivePayload = applySyncPolicy(operationId, payload, execution.syncPolicy);

      const startedAt = Date.now();
      try {
        const response = await transport({
          endpoint: operation.endpoint,
          timeoutMs: operation.timeoutMs,
          body: { call: operation.call, app_key: execution.credential.key, app_secret: execution.credential.secret, param: [effectivePayload] },
          correlationId: context.correlationId,
        });
        await audit({
          tenantId: context.tenantId,
          appInstanceId: context.appInstanceId,
          environment: context.environment,
          actorId: context.actorId,
          omieConnectionId,
          operationId,
          syncPolicyVersion: execution.syncPolicy?.contractVersion,
          outcome: "success",
          durationMs: Date.now() - startedAt,
          correlationId: context.correlationId,
        });
        return response;
      } catch (error) {
        await audit({
          tenantId: context.tenantId,
          appInstanceId: context.appInstanceId,
          environment: context.environment,
          actorId: context.actorId,
          omieConnectionId,
          operationId,
          syncPolicyVersion: execution.syncPolicy?.contractVersion,
          outcome: "failure",
          errorCode: error.code || "PROVIDER_ERROR",
          durationMs: Date.now() - startedAt,
          correlationId: context.correlationId,
        });
        throw error;
      }
    },
  });
}

module.exports = { REQUIRED_CONTEXT, SYNC_POLICY_CONTRACT_VERSION, applySyncPolicy, assertContext, createRegistrationAdapter };
