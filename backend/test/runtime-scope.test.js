const test = require("node:test");
const assert = require("node:assert/strict");
const { runtimeScope } = require("../src/services/runtimeScope");

test("resolve o deployment do OonCore quando APP_INSTANCE_ID não foi injetado", async () => {
  const previous = { instance: process.env.APP_INSTANCE_ID, environment: process.env.APP_ENVIRONMENT };
  delete process.env.APP_INSTANCE_ID; process.env.APP_ENVIRONMENT = "desenvolvimento";
  try {
    const scope = await runtimeScope(
      { tenantId: "tenant-1", userId: "user-1", appCode: "cadastros-omie" },
      { operationalRequestHeaders: async () => ({ "x-oon-deployment-id": "deployment-cad" }) },
    );
    assert.equal(scope.appInstanceId, "deployment-cad");
    assert.equal(scope.environment, "desenvolvimento");
  } finally {
    if (previous.instance === undefined) delete process.env.APP_INSTANCE_ID; else process.env.APP_INSTANCE_ID = previous.instance;
    if (previous.environment === undefined) delete process.env.APP_ENVIRONMENT; else process.env.APP_ENVIRONMENT = previous.environment;
  }
});
