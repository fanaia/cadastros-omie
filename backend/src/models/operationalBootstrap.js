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
    sampleSize: { type: Number, required: true, default: 10, min: 1, max: 50 },
    lastTestAt: { type: Date },
    lastTestOutcome: { type: String, enum: ["not_tested", "success", "partial", "failure"], default: "not_tested" },
    lastCorrelationId: { type: String, trim: true },
    lastTestSummary: { type: String, trim: true },
  },
});

state.mongooseModel.schema.index(
  { tenantId: 1, appInstanceId: 1, environment: 1 },
  { unique: true, name: "registration_bootstrap_scope_unique" },
);
