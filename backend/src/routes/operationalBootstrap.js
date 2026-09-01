const { defineRoutes } = require("@oondemand/oon-core-back");
const service = require("../services/bootstrapService");

const READ_PERMISSIONS = [
  "cadastros.partner.read.connection", "cadastros.category.read.connection",
  "cadastros.department.read.connection", "cadastros.project.read.connection",
];
const SYNC_PERMISSIONS = [
  "cadastros.partner.sync.connection", "cadastros.category.sync.connection",
  "cadastros.department.sync.connection", "cadastros.project.sync.connection",
];

function safeFailure(res, error) {
  res.status(error.statusCode || 500).json({ error: {
    code: error.code || "OPERATION_FAILED",
    message: error.statusCode && error.statusCode < 500 ? error.message : "Não foi possível concluir a operação.",
  } });
}

function handle(handler) {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) { safeFailure(res, error); }
  };
}

defineRoutes("/cadastros", (router) => {
  router.private.get("/bootstrap", { permission: READ_PERMISSIONS }, handle(async (req, res) => {
    res.json(await service.describeBootstrap(req.accessContext));
  }));
  router.private.put("/bootstrap", {
    permission: SYNC_PERMISSIONS,
    audit: { entidade: "RegistrationBootstrap", acao: "configure" },
  }, handle(async (req, res) => {
    res.json(await service.saveBootstrap(req.accessContext, req.body));
  }));
  router.private.post("/sync/test", {
    permission: SYNC_PERMISSIONS,
    audit: { entidade: "RegistrationBootstrap", acao: "test" },
  }, handle(async (req, res) => {
    res.json(await service.testSynchronization(req.accessContext));
  }));
});
