const { defineRoutes } = require("@oondemand/oon-core-back");
const service = require("../services/bootstrapService");
const resolverBindings = require("../services/resolverBindingService");

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
  router.private.get("/overview", { permission: READ_PERMISSIONS }, handle(async (req, res) => {
    res.json(await service.overview(req.accessContext));
  }));
  router.private.get("/connections", { permission: READ_PERMISSIONS }, handle(async (req, res) => {
    res.json(await service.listConnections(req.accessContext));
  }));
  router.private.get("/resolver-bindings", { permission: READ_PERMISSIONS }, handle(async (req, res) => {
    res.json(await resolverBindings.listResolverBindings(req.accessContext));
  }));
  router.private.put("/resolver-bindings", {
    permission: SYNC_PERMISSIONS,
    audit: { entidade: "OmieResolverBinding", acao: "configure" },
  }, handle(async (req, res) => {
    res.json(await resolverBindings.saveResolverBinding(req.accessContext, req.body));
  }));
  router.private.get("/entities/:entity", { permission: READ_PERMISSIONS }, handle(async (req, res) => {
    res.json(await service.listEntities(req.accessContext, req.params.entity, req.query));
  }));
  router.private.post("/entities/partners", {
    permission: "cadastros.partner.write.connection",
    audit: { entidade: "Partner", acao: "upsert" },
  }, handle(async (req, res) => {
    res.status(201).json(await service.upsertPartner(req.accessContext, req.body, req.get("Idempotency-Key")));
  }));
  router.private.post("/entities/projects", {
    permission: "cadastros.project.write.connection",
    audit: { entidade: "Project", acao: "upsert" },
  }, handle(async (req, res) => {
    res.status(201).json(await service.upsertProject(req.accessContext, req.body, req.get("Idempotency-Key")));
  }));
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
    res.json(await service.testSynchronization(req.accessContext, req.body));
  }));
  router.private.post("/sync/run", {
    permission: SYNC_PERMISSIONS,
    audit: { entidade: "RegistrationSync", acao: "run" },
  }, handle(async (req, res) => {
    res.json(await service.syncConnection(req.accessContext, req.body, req.get("Idempotency-Key")));
  }));
  router.private.post("/sync/retry", {
    permission: SYNC_PERMISSIONS,
    audit: { entidade: "RegistrationSync", acao: "retry-failures" },
  }, handle(async (req, res) => {
    res.json(await service.retryFailedSynchronization(req.accessContext, req.body, req.get("Idempotency-Key")));
  }));
  router.private.get("/sync/runs", { permission: READ_PERMISSIONS }, handle(async (req, res) => {
    res.json(await service.listSyncRuns(req.accessContext, req.query));
  }));
});
