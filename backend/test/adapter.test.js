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

test("adapter de Cadastros resolve a conexão e não registra segredo", async () => {
  const audits = [];
  let request;
  const adapter = createRegistrationAdapter({
    resolveExecutionContext: async () => ({ allowed: true, status: "active", credential: { key: "key-value", secret: "secret-value" } }),
    transport: async (input) => { request = input; return { clientes_cadastro: [] }; },
    audit: async (event) => audits.push(event),
  });

  const result = await adapter.execute({ context, omieConnectionId: "conn-a", operationId: "partner.list", payload: { pagina: 1 } });
  assert.deepEqual(result, { clientes_cadastro: [] });
  assert.equal(request.body.call, "ListarClientes");
  assert.equal(request.body.app_key, "key-value");
  assert.equal(request.body.app_secret, "secret-value");
  assert.doesNotMatch(JSON.stringify(audits), /key-value|secret-value/);
});

test("adapter falha fechado para conexão não autorizada", async () => {
  const adapter = createRegistrationAdapter({ resolveExecutionContext: async () => ({ allowed: false }), transport: async () => ({}) });
  await assert.rejects(() => adapter.execute({ context, omieConnectionId: "conn-b", operationId: "partner.list" }), { code: "CONNECTION_NOT_AUTHORIZED" });
});

test("mapper preserva a origem e minimiza o documento", () => {
  assert.deepEqual(toPartnerProjection({ codigo_cliente_omie: 10, codigo_cliente_integracao: "CLI-10", razao_social: "Cliente Teste", nome_fantasia: "Teste", cnpj_cpf: "12345678000199", inativo: "N" }, "conn-a"), {
    omieConnectionId: "conn-a",
    externalId: 10,
    integrationCode: "CLI-10",
    legalName: "Cliente Teste",
    tradeName: "Teste",
    documentLast4: "0199",
    active: true,
  });
});
