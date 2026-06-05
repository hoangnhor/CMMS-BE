const test = require("node:test");
const assert = require("node:assert/strict");

const Asset = require("../src/models/Asset");
const { ensureAssetExists } = require("../src/services/workOrderPolicy.service");

test("ensureAssetExists rejects disposed assets", async () => {
  const originalFindById = Asset.findById;
  Asset.findById = () => ({
    select: () => ({
      lean: async () => ({ status: "disposed" }),
    }),
  });

  await assert.rejects(
    () => ensureAssetExists("507f1f77bcf86cd799439011"),
    /thanh lý/
  );

  Asset.findById = originalFindById;
});

test("ensureAssetExists accepts active assets", async () => {
  const originalFindById = Asset.findById;
  Asset.findById = () => ({
    select: () => ({
      lean: async () => ({ status: "active" }),
    }),
  });

  const id = "507f1f77bcf86cd799439011";
  await assert.doesNotReject(() => ensureAssetExists(id));

  Asset.findById = originalFindById;
});
