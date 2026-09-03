const { defineModel } = require("@oondemand/oon-core-back");

const state = defineModel({
  name: "RegistrationBootstrapState",
  singular: "registrationBootstrapState",
  scope: "tenant",
  crud: { enabled: false },
  schema: {
    appInstanceId: { type: String, required: true, trim: true },
    environment: { type: String, required: true, trim: true },
    connectionId: { type: String, required: true, trim: true },
    entities: { type: [String], required: true, default: [] },
    sampleSize: { type: Number, required: true, default: 50, min: 1, max: 100 },
    lastTestAt: { type: Date },
    lastTestOutcome: { type: String, enum: ["not_tested", "success", "partial", "failure"], default: "not_tested" },
    lastCorrelationId: { type: String, trim: true },
    lastTestSummary: { type: String, trim: true },
    lastResults: { type: [Object], default: [] },
    syncStatus: { type: String, enum: ["idle", "running"], default: "idle" },
    syncLeaseId: { type: String, trim: true },
    syncLeaseExpiresAt: { type: Date },
  },
});

state.mongooseModel.schema.index(
  { tenantId: 1, appInstanceId: 1, environment: 1, connectionId: 1 },
  { unique: true, name: "registration_bootstrap_scope_unique" },
);

const command = defineModel({
  name: "RegistrationCommand",
  singular: "registrationCommand",
  scope: "tenant",
  crud: { enabled: false },
  schema: {
    appInstanceId: { type: String, required: true, trim: true },
    environment: { type: String, required: true, trim: true },
    connectionId: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true, select: false },
    operationId: { type: String, required: true, trim: true },
    outcome: { type: String, enum: ["processing", "success", "failure"], default: "processing" },
    response: { type: Object },
    errorCode: { type: String, trim: true },
  },
});

command.mongooseModel.schema.index(
  { tenantId: 1, appInstanceId: 1, environment: 1, connectionId: 1, idempotencyKey: 1 },
  { unique: true, name: "registration_command_idempotency_unique" },
);

const syncRun = defineModel({
  name: "RegistrationSyncRun",
  singular: "registrationSyncRun",
  scope: "tenant",
  crud: { enabled: false },
  schema: {
    appInstanceId: { type: String, required: true, trim: true },
    environment: { type: String, required: true, trim: true },
    connectionId: { type: String, required: true, trim: true },
    runId: { type: String, required: true, trim: true },
    idempotencyKey: { type: String, required: true, trim: true, select: false },
    trigger: { type: String, enum: ["manual", "retry", "test"], required: true },
    correlationId: { type: String, required: true, trim: true },
    entities: { type: [String], required: true, default: [] },
    requestedBy: { type: String, required: true, trim: true },
    status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
    outcome: { type: String, enum: ["success", "partial", "failure"] },
    summary: { type: String, trim: true },
    results: { type: [Object], default: [] },
    response: { type: Object },
    errorCode: { type: String, trim: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
  },
});

syncRun.mongooseModel.schema.index(
  { tenantId: 1, appInstanceId: 1, environment: 1, connectionId: 1, idempotencyKey: 1 },
  { unique: true, name: "registration_sync_run_idempotency_unique" },
);
syncRun.mongooseModel.schema.index(
  { tenantId: 1, appInstanceId: 1, environment: 1, connectionId: 1, startedAt: -1 },
  { name: "registration_sync_run_history" },
);
