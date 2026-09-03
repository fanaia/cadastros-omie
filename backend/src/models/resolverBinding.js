const { defineModel } = require("@oondemand/oon-core-back");

const binding = defineModel({
  name: "OmieResolverBinding",
  singular: "omieResolverBinding",
  scope: "tenant",
  crud: { enabled: false },
  schema: {
    appInstanceId: { type: String, required: true, trim: true },
    environment: { type: String, required: true, trim: true },
    connectionId: { type: String, required: true, trim: true },
    providerUrl: { type: String, required: true, trim: true },
    providerAppInstanceId: { type: String, required: true, trim: true },
    grantId: { type: String, required: true, trim: true },
    encryptedSecret: { type: String, required: true, select: false },
    rotatedAt: { type: Date, required: true, default: Date.now },
  },
});

binding.mongooseModel.schema.index(
  { tenantId: 1, appInstanceId: 1, environment: 1, connectionId: 1 },
  { unique: true, name: "omie_resolver_binding_scope_unique" },
);
