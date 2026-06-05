const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveAssetId } = require("../src/services/pmEngine.service");

test("resolveAssetId returns _id from populated asset document", () => {
  assert.equal(
    resolveAssetId({ _id: "507f1f77bcf86cd799439011", assetType: "machine" }),
    "507f1f77bcf86cd799439011"
  );
});

test("resolveAssetId returns raw asset id values", () => {
  assert.equal(resolveAssetId("507f1f77bcf86cd799439012"), "507f1f77bcf86cd799439012");
});
