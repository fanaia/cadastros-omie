const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
test("rotas code-first cobrem jornada operacional", () => {
  const routes = fs.readFileSync(path.join(root, "frontend/src/app/routes.tsx"), "utf8");
  for (const pathName of ["/parceiros", "/auxiliares", "/sincronizacao"]) assert.match(routes, new RegExp(pathName));
});

test("base e situação permanecem visíveis nas listas", () => {
  const source = ["PartnersPage.tsx", "AuxiliariesPage.tsx"].map(file => fs.readFileSync(path.join(root, "frontend/src/pages", file), "utf8")).join("\n");
  assert.match(source, /omieConnectionId/);
  assert.match(source, /syncState/);
});

test("sincronização exibe base, protocolo e pré-requisitos", () => {
  const source = fs.readFileSync(path.join(root, "frontend/src/pages/SyncPage.tsx"), "utf8");
  for (const value of ["connectionId", "correlationId", "requirements"]) assert.match(source, new RegExp(value));
});

test("navegação usa abas, modais e toasts acessíveis", () => {
  const ui = fs.readFileSync(path.join(root, "frontend/src/components/Ui.tsx"), "utf8");
  const journeys = ["PartnersPage.tsx", "AuxiliariesPage.tsx"].map(file => fs.readFileSync(path.join(root, "frontend/src/pages", file), "utf8")).join("\n");
  for (const contract of ["role=\"tablist\"", "aria-live=\"polite\"", "aria-modal=\"true\""]) assert.match(ui, new RegExp(contract));
  assert.match(journeys, /<Modal/);
});
