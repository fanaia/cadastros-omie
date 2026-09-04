const test = require("node:test");
const assert = require("node:assert/strict");
const { validatePairing } = require("../src/services/resolverBindingService");

const pairing = {
  schemaVersion: 1,
  syncPolicyContractVersion: 1,
  providerUrl: "https://configuracoes.dev.example.com",
  providerAppInstanceId: "config-app",
  environment: "dev",
  connectionId: "omie-matriz",
  consumerAppCode: "cadastros-omie",
  grantId: "grant-123",
  secret: "01234567890123456789012345678901",
};

test("Cadastros aceita pairing compatível com o Control Plane v1", () => {
  const result = validatePairing(pairing, "dev");
  assert.equal(result.connectionId, "omie-matriz");
});

test("Cadastros rejeita pairing sem versão compatível da política", () => {
  assert.throws(() => validatePairing({ ...pairing, syncPolicyContractVersion: undefined }, "dev"), { code: "UNSUPPORTED_SYNC_POLICY_CONTRACT" });
  assert.throws(() => validatePairing({ ...pairing, syncPolicyContractVersion: 2 }, "dev"), { code: "UNSUPPORTED_SYNC_POLICY_CONTRACT" });
});
