process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_that_is_long_enough_123456";
process.env.REFRESH_JWT_SECRET =
  process.env.REFRESH_JWT_SECRET || "refresh_secret_that_is_long_enough_123456";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const WorkOrder = require("../src/models/WorkOrder");
const PmSchedule = require("../src/models/PmSchedule");
const MachineDetail = require("../src/models/MachineDetail");
const workOrderService = require("../src/services/workOrder.service");

test("createWorkOrderFromPmSchedule returns existing WO when same schedule/value already created", async () => {
  const originalFindById = PmSchedule.findById;
  const originalFindOne = WorkOrder.findOne;
  const originalMachineFindOne = MachineDetail.findOne;
  const originalStartSession = mongoose.startSession;

  const scheduleDoc = {
    _id: "507f1f77bcf86cd799439012",
    isActive: true,
    intervalValue: 10,
    triggerType: "hours",
    nextDueValue: 0,
    assetId: { _id: "507f1f77bcf86cd799439013", assetType: "machine" },
  };

  PmSchedule.findById = () => ({
    populate: () => ({
      session: async () => scheduleDoc,
    }),
  });

  const existing = { _id: "wo-existing-1" };
  WorkOrder.findOne = () => ({
    session: () => ({
      lean: async () => existing,
    }),
  });
  MachineDetail.findOne = () => ({
    lean: async () => ({ spindleHours: 0 }),
  });
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  });

  const result = await workOrderService.createWorkOrderFromPmSchedule(scheduleDoc._id, "507f1f77bcf86cd799439011");
  assert.equal(result._id, existing._id);

  PmSchedule.findById = originalFindById;
  WorkOrder.findOne = originalFindOne;
  MachineDetail.findOne = originalMachineFindOne;
  mongoose.startSession = originalStartSession;
});

test("createWorkOrderFromPmSchedule rejects disposed asset", async () => {
  const originalFindById = PmSchedule.findById;
  const originalStartSession = mongoose.startSession;

  const scheduleDoc = {
    _id: "507f1f77bcf86cd799439012",
    isActive: true,
    intervalValue: 10,
    triggerType: "hours",
    nextDueValue: 0,
    assetId: { _id: "507f1f77bcf86cd799439013", assetType: "machine", status: "disposed" },
  };

  PmSchedule.findById = () => ({
    populate: () => ({
      session: async () => scheduleDoc,
    }),
  });
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  });

  await assert.rejects(
    () => workOrderService.createWorkOrderFromPmSchedule(scheduleDoc._id, "507f1f77bcf86cd799439011"),
    /thanh lý/
  );

  PmSchedule.findById = originalFindById;
  mongoose.startSession = originalStartSession;
});
