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

test("toda projeção exige conexão e reserva escrita ao sincronizador", () => {
  const domain = readJson("backend/central.domain.json");
  for (const model of domain.models) {
    assert.equal(model.fields.omieConnectionId.required, true, `${model.name} sem conexão obrigatória`);
    assert.ok(model.crud.roles.write.includes("__omie_sync__"), `${model.name} expõe escrita fora do worker`);
    assert.equal(model.fields.externalId.readonly, true, `${model.name}.externalId deve ser readonly`);
    assert.equal(model.fields.syncState.readonly, true, `${model.name}.syncState deve ser readonly`);
  }
});

test("app não armazena credenciais Omie", () => {
  const files = ["backend/central.domain.json", "frontend/central.ui.json", "central.app.json"];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8").toLowerCase();
    assert.doesNotMatch(source, /app[_-]?secret|app[_-]?key|credentialref/);
  }
});

test("UI preserva origem nas cinco coleções", () => {
  const ui = readJson("frontend/central.ui.json");
  assert.deepEqual(ui.collections.map((item) => item.model), ["PartnerProjection", "CategoryProjection", "DepartmentProjection", "ProjectProjection", "AttachmentReference"]);
  for (const collection of ui.collections) {
    const fields = collection.list.columns.map((column) => typeof column === "string" ? column : column.field);
    assert.ok(fields.includes("omieConnectionId"), `${collection.model} não exibe origem`);
  }
});

test("RBAC declara leitura, escrita, sync e picker por conexão", () => {
  const app = readJson("central.app.json");
  assert.equal(app.modules.omie, false);
  assert.ok(!app.capabilities.includes("core.integrations.omie"));
  assert.ok(app.capabilities.includes("omie-config.connection-resolver.v1"));
  assert.ok(app.rbac.permissions.includes("cadastros.partner.read.connection"));
  assert.ok(app.rbac.permissions.includes("cadastros.partner.write.connection"));
  assert.ok(app.rbac.permissions.includes("cadastros.partner.sync.connection"));
  assert.ok(app.rbac.permissions.includes("cadastros.picker.read.connection"));
});
