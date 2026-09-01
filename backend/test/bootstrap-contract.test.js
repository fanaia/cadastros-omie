const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const { signExecutionRequest } = require("../src/services/executionSignature");

test("assinatura vincula tenant, instâncias, conexão, operação e protocolo", () => {
  const body = {
    tenantId: "tenant-1",
    requesterAppInstanceId: "cad-1",
    configurationAppInstanceId: "cfg-1",
    environment: "production",
    actorId: "user-1",
    connectionId: "conn-1",
    operationId: "partner.list",
    correlationId: "corr-1",
  };
  const signature = signExecutionRequest("shared-secret", body, 1234, "cadastros-omie");
  assert.equal(signature.length, 64);
  assert.notEqual(signature, signExecutionRequest("shared-secret", { ...body, connectionId: "conn-2" }, 1234, "cadastros-omie"));
  assert.notEqual(signature, signExecutionRequest("shared-secret", { ...body, operationId: "project.list" }, 1234, "cadastros-omie"));
});

test("bootstrap não aceita nem publica credenciais Omie", () => {
  const sources = [
    "backend/src/routes/operationalBootstrap.js",
    "backend/src/services/bootstrapService.js",
    "ui/src/index.tsx",
  ].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.doesNotMatch(sources, /app[_-]?(key|secret)/i);
  assert.match(sources, /resolveExecutionContext/);
});

test("página customizada substitui CRUD no primeiro uso", () => {
  const ui = JSON.parse(fs.readFileSync(path.join(root, "frontend/central.ui.json"), "utf8"));
  const main = fs.readFileSync(path.join(root, "frontend/src/main.tsx"), "utf8");
  assert.equal(ui.pages[0].label, "Inicialização");
  assert.equal(ui.pages[0].component, "CadastrosInitializationPage");
  assert.match(main, /customComponents:\s*\{ CadastrosInitializationPage \}/);
});
