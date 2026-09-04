const test = require("node:test");
const assert = require("node:assert/strict");
const { createRegistrationAdapter } = require("../src/integrations/erp/adapter");
const { toPartnerProjection } = require("../src/integrations/erp/mappers");

const context = {
  tenantId: "tenant-a",
  appInstanceId: "instance-a",
  environment: "homolog",
  actorId: "service-sync",
  correlationId: "corr-a",
};
const syncPolicy = { contractVersion: 1, strategy: "incremental", status: "active", intervalMinutes: 30, pageSize: 37, overlapMinutes: 15 };

test("adapter de Cadastros aplica paginação do Control Plane e não registra segredo", async () => {
  const audits = [];
  let request;
  const adapter = createRegistrationAdapter({
    resolveExecutionContext: async () => ({ allowed: true, status: "active", syncPolicy, credential: { key: "key-value", secret: "secret-value" } }),
    transport: async (input) => { request = input; return { clientes_cadastro: [] }; },
    audit: async (event) => audits.push(event),
  });

  const result = await adapter.execute({ context, omieConnectionId: "conn-a", operationId: "partner.list", payload: { pagina: 1, registros_por_pagina: 99 } });
  assert.deepEqual(result, { clientes_cadastro: [] });
  assert.equal(request.body.call, "ListarClientes");
  assert.equal(request.body.param[0].registros_por_pagina, 37);
  assert.equal(request.body.app_key, "key-value");
  assert.equal(request.body.app_secret, "secret-value");
  assert.equal(audits[0].syncPolicyVersion, 1);
  assert.doesNotMatch(JSON.stringify(audits), /key-value|secret-value/);
});

test("adapter bloqueia sincronização pausada no Control Plane", async () => {
  const adapter = createRegistrationAdapter({
    resolveExecutionContext: async () => ({ allowed: true, status: "active", syncPolicy: { ...syncPolicy, status: "paused" }, credential: { key: "key", secret: "secret" } }),
    transport: async () => ({}),
  });
  await assert.rejects(() => adapter.execute({ context, omieConnectionId: "conn-a", operationId: "partner.list" }), { code: "SYNC_POLICY_PAUSED" });
});

test("adapter falha fechado quando contrato central está ausente", async () => {
  const adapter = createRegistrationAdapter({
    resolveExecutionContext: async () => ({ allowed: true, status: "active", credential: { key: "key", secret: "secret" } }),
    transport: async () => ({}),
  });
  await assert.rejects(() => adapter.execute({ context, omieConnectionId: "conn-a", operationId: "partner.list" }), { code: "SYNC_POLICY_REQUIRED" });
});

test("adapter falha fechado para conexão não autorizada", async () => {
  const adapter = createRegistrationAdapter({ resolveExecutionContext: async () => ({ allowed: false }), transport: async () => ({}) });
  await assert.rejects(() => adapter.execute({ context, omieConnectionId: "conn-b", operationId: "partner.list" }), { code: "CONNECTION_NOT_AUTHORIZED" });
});

test("mapper preserva a origem e minimiza o documento", () => {
  const result = toPartnerProjection({ codigo_cliente_omie: 10, codigo_cliente_integracao: "CLI-10", razao_social: "Cliente Teste", nome_fantasia: "Teste", cnpj_cpf: "12345678000199", inativo: "N" }, "conn-a");
  assert.equal(result.omieConnectionId, "conn-a");
  assert.equal(result.externalId, 10);
  assert.match(result.documentMasked, /0199$/);
  assert.doesNotMatch(result.documentMasked, /12345678/);
  assert.equal(result.syncState, "Sincronizado");
});
