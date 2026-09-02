const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

test("manifesto declara todas as projeções fundacionais", () => {
  const domain = readJson("backend/central.domain.json");
  assert.deepEqual(domain.models.map((model) => model.name), ["PartnerProjection", "CategoryProjection", "DepartmentProjection", "ProjectProjection", "AttachmentReference"]);
});

test("toda projeção exige tenant e conexão e reserva escrita ao sincronizador", () => {
  const domain = readJson("backend/central.domain.json");
  for (const model of domain.models) {
    assert.equal(model.fields.tenantId.required, true, `${model.name} sem tenant obrigatório`);
    assert.equal(model.fields.tenantId.readonly, true, `${model.name}.tenantId deve ser readonly`);
    assert.equal(model.fields.tenantId.index, true, `${model.name}.tenantId deve ser indexado`);
    assert.equal(model.fields.omieConnectionId.required, true, `${model.name} sem conexão obrigatória`);
    assert.ok(model.crud.roles.write.includes("__omie_sync__"), `${model.name} expõe escrita fora do worker`);
    assert.equal(model.fields.externalId.readonly, true, `${model.name}.externalId deve ser readonly`);
    assert.equal(model.fields.syncState.readonly, true, `${model.name}.syncState deve ser readonly`);
  }
});

test("app não armazena credenciais Omie", () => {
  const files = ["backend/central.domain.json", "frontend/src/app/routes.tsx", "central.app.json"];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8").toLowerCase();
    assert.doesNotMatch(source, /app[_-]?secret|app[_-]?key|credentialref/);
  }
});

test("UI code-first preserva origem nas telas operacionais", () => {
  const source = ["DashboardPage.tsx", "PartnersPage.tsx", "AuxiliariesPage.tsx", "SyncPage.tsx"].map(file => fs.readFileSync(path.join(root, "frontend/src/pages", file), "utf8")).join("\n");
  assert.match(source, /connectionId/);
  assert.match(source, /omieConnectionId/);
});

test("RBAC declara leitura, escrita, sync e picker por conexão", () => {
  const app = readJson("central.app.json");
  assert.ok(!app.capabilities.includes("core.integrations.omie"));
  assert.ok(app.capabilities.includes("omie-config.connection-resolver.v1"));
  assert.ok(app.rbac.permissions.includes("cadastros.partner.read.connection"));
  assert.ok(app.rbac.permissions.includes("cadastros.partner.write.connection"));
  assert.ok(app.rbac.permissions.includes("cadastros.partner.sync.connection"));
  assert.ok(app.rbac.permissions.includes("cadastros.picker.read.connection"));
});
