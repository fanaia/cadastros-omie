const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const {
  mergeEntityResults,
  normalizeEntitySelection,
  retryableEntities,
  summarizeResults,
} = require("../src/services/bootstrapService");

test("reprocessamento seleciona somente falhas válidas sem duplicar entidades", () => {
  assert.deepEqual(retryableEntities([
    { entity: "partners", ok: false },
    { entity: "partners", ok: false },
    { entity: "categories", ok: true },
    { entity: "unknown", ok: false },
    { entity: "projects", ok: false },
  ]), ["partners", "projects"]);
});

test("seleção explícita fica restrita aos cadastros configurados", () => {
  assert.deepEqual(normalizeEntitySelection(["partners", "projects"], ["projects"]), ["projects"]);
  assert.throws(
    () => normalizeEntitySelection(["partners"], ["categories"]),
    error => error.code === "ENTITY_NOT_CONFIGURED" && error.statusCode === 409,
  );
});

test("resultado seletivo substitui apenas as entidades reprocessadas", () => {
  const merged = mergeEntityResults(
    ["partners", "categories", "projects"],
    [
      { entity: "partners", ok: false, count: 0, code: "TIMEOUT" },
      { entity: "categories", ok: true, count: 10 },
    ],
    [{ entity: "partners", ok: true, count: 20 }],
  );
  assert.deepEqual(merged, [
    { entity: "partners", ok: true, count: 20 },
    { entity: "categories", ok: true, count: 10 },
    { entity: "projects", ok: false, count: 0, code: "NOT_RUN" },
  ]);
  assert.deepEqual(summarizeResults(merged), {
    outcome: "partial",
    summary: "2/3 tipos sincronizados • 30 registros",
  });
});

test("contrato operacional exige idempotência, lock e auditoria", () => {
  const service = fs.readFileSync(path.join(root, "backend/src/services/bootstrapService.js"), "utf8");
  const routes = fs.readFileSync(path.join(root, "backend/src/routes/operationalBootstrap.js"), "utf8");
  const model = fs.readFileSync(path.join(root, "backend/src/models/operationalBootstrap.js"), "utf8");
  for (const value of ["Idempotency-Key", "SYNC_IN_PROGRESS", "syncLeaseExpiresAt", "RegistrationSyncRun"]) {
    assert.match(service + routes + model, new RegExp(value));
  }
  assert.match(routes, /\/sync\/retry/);
  assert.match(routes, /retry-failures/);
});

test("interface oferece reprocessamento e histórico sem ação fictícia", () => {
  const source = fs.readFileSync(path.join(root, "frontend/src/pages/SyncPage.tsx"), "utf8");
  for (const value of ["Reprocessar falhas", "Execuções recentes", "Idempotency-Key", "/cadastros/sync/retry"]) {
    assert.match(source, new RegExp(value));
  }
});
