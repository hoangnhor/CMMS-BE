const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Asset = require("../src/models/Asset");
const MachineDetail = require("../src/models/MachineDetail");
const WorkOrder = require("../src/models/WorkOrder");
const MaintenanceLog = require("../src/models/MaintenanceLog");
const PmSchedule = require("../src/models/PmSchedule");
const assetService = require("../src/services/asset.service");

test("createAsset rejects reused assetCode even when old asset is disposed", async () => {
  const originalFindOne = Asset.findOne;
  const originalCreate = Asset.create;
  const originalMachineCreate = MachineDetail.create;
  const originalStartSession = mongoose.startSession;

  Asset.findOne = () => ({
    session: () => ({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439099",
        assetCode: "A-001",
        status: "disposed",
      }),
    }),
  });
  Asset.create = async () => {
    throw new Error("should not be called");
  };
  MachineDetail.create = async () => {
    throw new Error("should not be called");
  };
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  });

  await assert.rejects(
    () =>
      assetService.createAsset({
        assetCode: "A-001",
        name: "Asset 1",
        assetType: "machine",
      }),
    /Mã tài sản đã tồn tại/
  );

  Asset.findOne = originalFindOne;
  Asset.create = originalCreate;
  MachineDetail.create = originalMachineCreate;
  mongoose.startSession = originalStartSession;
});

test("deleteAsset blocks when asset has historical references", async () => {
  const originalFindById = Asset.findById;
  const originalDeleteOne = Asset.deleteOne;
  const originalMachineDeleteOne = MachineDetail.deleteOne;
  const originalWorkOrderCount = WorkOrder.countDocuments;
  const originalMaintenanceCount = MaintenanceLog.countDocuments;
  const originalPmCount = PmSchedule.countDocuments;
  const originalStartSession = mongoose.startSession;

  Asset.findById = () => ({
    lean: async () => ({
      _id: "507f1f77bcf86cd799439010",
      assetType: "machine",
    }),
  });
  Asset.deleteOne = async () => {
    throw new Error("should not be called");
  };
  MachineDetail.deleteOne = () => ({
    session: async () => {
      throw new Error("should not be called");
    },
  });
  WorkOrder.countDocuments = () => ({
    session: async () => 1,
  });
  MaintenanceLog.countDocuments = () => ({
    session: async () => 0,
  });
  PmSchedule.countDocuments = () => ({
    session: async () => 0,
  });
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  });

  await assert.rejects(
    () => assetService.deleteAsset("507f1f77bcf86cd799439010"),
    /lịch sử nghiệp vụ/
  );

  Asset.findById = originalFindById;
  Asset.deleteOne = originalDeleteOne;
  MachineDetail.deleteOne = originalMachineDeleteOne;
  WorkOrder.countDocuments = originalWorkOrderCount;
  MaintenanceLog.countDocuments = originalMaintenanceCount;
  PmSchedule.countDocuments = originalPmCount;
  mongoose.startSession = originalStartSession;
});
