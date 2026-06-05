const test = require("node:test");
const assert = require("node:assert/strict");

const WorkOrder = require("../src/models/WorkOrder");
const MaintenanceLog = require("../src/models/MaintenanceLog");
const User = require("../src/models/User");
const userService = require("../src/services/user.service");

test("deleteUser blocks users with historical references", async () => {
  const originalCountDocuments = WorkOrder.countDocuments;
  const originalLogCountDocuments = MaintenanceLog.countDocuments;
  const originalDelete = User.findByIdAndDelete;

  WorkOrder.countDocuments = async () => 1;
  MaintenanceLog.countDocuments = async () => 0;
  User.findByIdAndDelete = () => ({
    select: () => ({
      lean: async () => null,
    }),
  });

  await assert.rejects(
    () => userService.deleteUser("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"),
    /lịch sử nghiệp vụ/
  );

  WorkOrder.countDocuments = originalCountDocuments;
  MaintenanceLog.countDocuments = originalLogCountDocuments;
  User.findByIdAndDelete = originalDelete;
});

test("deleteUser allows users without references", async () => {
  const originalCountDocuments = WorkOrder.countDocuments;
  const originalLogCountDocuments = MaintenanceLog.countDocuments;
  const originalDelete = User.findByIdAndDelete;

  WorkOrder.countDocuments = async () => 0;
  MaintenanceLog.countDocuments = async () => 0;
  User.findByIdAndDelete = () => ({
    select: () => ({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439011",
        email: "user@test.local",
      }),
    }),
  });

  const result = await userService.deleteUser("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012");
  assert.equal(result._id, "507f1f77bcf86cd799439011");

  WorkOrder.countDocuments = originalCountDocuments;
  MaintenanceLog.countDocuments = originalLogCountDocuments;
  User.findByIdAndDelete = originalDelete;
});
