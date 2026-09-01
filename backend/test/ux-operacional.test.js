const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const ui = JSON.parse(fs.readFileSync(path.join(root, "frontend/central.ui.json"), "utf8"));

test("todas as coleções começam por resumo operacional", () => {
  for (const collection of ui.collections) {
    assert.equal(collection.detailModal.defaultTab, "resumo", `${collection.model} sem resumo inicial`);
    assert.equal(collection.detailModal.tabs[0].type, "summary", `${collection.model} sem summary`);
  }
});

test("base e situação permanecem visíveis em todas as listas", () => {
  for (const collection of ui.collections) {
    const columns = Object.fromEntries(collection.list.columns.map((column) => [column.field, column]));
    assert.ok(columns.omieConnectionId, `${collection.model} sem base na lista`);
    assert.equal(columns.syncState.format, "badge", `${collection.model} sem badge de sincronização`);
    const filters = collection.list.filters.map((filter) => filter.field);
    assert.ok(filters.includes("omieConnectionId"), `${collection.model} sem filtro de base`);
    assert.ok(filters.includes("syncState"), `${collection.model} sem filtro de situação`);
  }
});

test("exceções abrem diretamente na sincronização", () => {
  for (const collection of ui.collections) {
    const action = collection.list.rowActions.find((item) => item.id === "analisarSincronizacao");
    assert.equal(action.initialTab, "sincronizacao", `${collection.model} sem entrada de análise`);
    assert.deepEqual(action.hiddenWhen, { field: "syncState", in: ["Sincronizado", "Inativo"] });
  }
});

test("manifesto não inventa comandos de backend", () => {
  const actions = ui.collections.flatMap((collection) => collection.list.rowActions || []);
  assert.ok(actions.every((action) => action.type !== "apiAction"));
});

test("projeções continuam sem edição inline", () => {
  for (const collection of ui.collections) {
    const relatedTabs = collection.detailModal.tabs.filter((tab) => tab.type === "relatedGrid");
    assert.ok(relatedTabs.every((tab) => tab.editable !== true));
  }
});
