const test = require("node:test");
const assert = require("node:assert/strict");

const Asset = require("../src/models/Asset");
const PmSchedule = require("../src/models/PmSchedule");
const pmScheduleService = require("../src/services/pmSchedule.service");

test("updatePmSchedule rejects incompatible trigger for asset type", async () => {
  const originalFindById = PmSchedule.findById;
  const originalFindByIdAndUpdate = PmSchedule.findByIdAndUpdate;
  const originalAssetFindById = Asset.findById;

  PmSchedule.findById = () => ({
    lean: async () => ({
      _id: "507f1f77bcf86cd799439012",
      assetId: "507f1f77bcf86cd799439013",
      triggerType: "hours",
      lastTriggeredValue: 0,
      intervalValue: 10,
      isActive: true,
    }),
  });
  PmSchedule.findByIdAndUpdate = async () => ({
    lean: async () => null,
  });
  Asset.findById = () => ({
    select: () => ({
      lean: async () => ({ assetType: "machine", status: "active" }),
    }),
  });

  await assert.rejects(
    () =>
      pmScheduleService.updatePmSchedule("507f1f77bcf86cd799439012", {
        triggerType: "shots",
      }),
    /không phù hợp/
  );

  PmSchedule.findById = originalFindById;
  PmSchedule.findByIdAndUpdate = originalFindByIdAndUpdate;
  Asset.findById = originalAssetFindById;
});

test("createPmSchedule rejects disposed asset", async () => {
  const originalFindById = Asset.findById;
  const originalCreate = PmSchedule.create;

  Asset.findById = () => ({
    select: () => ({
      lean: async () => ({ assetType: "machine", status: "disposed" }),
    }),
  });
  PmSchedule.create = async () => {
    throw new Error("should not be called");
  };

  await assert.rejects(
    () =>
      pmScheduleService.createPmSchedule({
        assetId: "507f1f77bcf86cd799439013",
        triggerType: "hours",
        intervalValue: 10,
      }),
    /thanh lý/
  );

  Asset.findById = originalFindById;
  PmSchedule.create = originalCreate;
});
