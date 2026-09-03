const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { decryptBinding, encryptBinding } = require("../src/services/bindingVault");

test("segredo do vínculo fica cifrado e autenticado", () => {
  const key = "chave-raiz-de-teste-fornecida-pelo-runtime";
  const envelope = encryptBinding({ secret: "segredo-tecnico-de-teste-com-entropia" }, key);
  assert.doesNotMatch(envelope, /segredo-tecnico/);
  assert.deepEqual(decryptBinding(envelope, key), { secret: "segredo-tecnico-de-teste-com-entropia" });
  const parts = envelope.split(".");
  parts[3] = (parts[3][0] === "a" ? "b" : "a") + parts[3].slice(1);
  assert.throws(() => decryptBinding(parts.join("."), key), { code: "BINDING_ENVELOPE_INVALID" });
});

test("vínculo valida módulo, ambiente e HTTPS", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/services/resolverBindingService.js"), "utf8");
  assert.match(source, /PAIRING_CONSUMER_MISMATCH/);
  assert.match(source, /PAIRING_ENVIRONMENT_MISMATCH/);
  assert.match(source, /https:/);
  assert.match(source, /encryptedSecret/);
  assert.doesNotMatch(source, /console\.(log|info|debug)/);
});

test("resultado de sincronização é persistido e não simula operação assíncrona", () => {
  const service = fs.readFileSync(path.join(__dirname, "../src/services/bootstrapService.js"), "utf8");
  const routes = fs.readFileSync(path.join(__dirname, "../src/routes/operationalBootstrap.js"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../../frontend/src/pages/SyncPage.tsx"), "utf8");
  assert.match(service, /lastResults: result/);
  assert.match(service, /totals\.errors = recentErrors\.length/);
  assert.doesNotMatch(routes, /status\(202\).*syncConnection/);
  assert.match(page, /result\.outcome === "success"/);
  assert.match(page, /Falhas:/);
});
