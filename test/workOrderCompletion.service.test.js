const test = require("node:test");
const assert = require("node:assert/strict");
const SparePartUsed = require("../src/models/SparePartUsed");
const { syncSparePartsUsed } = require("../src/services/workOrderCompletion.service");

test("syncSparePartsUsed deletes old parts even when incoming list is empty", async () => {
  const originalDeleteMany = SparePartUsed.deleteMany;
  const originalInsertMany = SparePartUsed.insertMany;
  let deleted = false;
  let inserted = false;

  SparePartUsed.deleteMany = async () => {
    deleted = true;
  };
  SparePartUsed.insertMany = async () => {
    inserted = true;
  };

  await syncSparePartsUsed("507f1f77bcf86cd799439011", []);

  assert.equal(deleted, true);
  assert.equal(inserted, false);
  SparePartUsed.deleteMany = originalDeleteMany;
  SparePartUsed.insertMany = originalInsertMany;
});
