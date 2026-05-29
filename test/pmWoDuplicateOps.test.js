const test = require("node:test");
const assert = require("node:assert/strict");
const WorkOrder = require("../src/models/WorkOrder");
const { autoFixDuplicatePmWorkOrders } = require("../src/config/db");

test("autoFixDuplicatePmWorkOrders keeps newest id and removes older duplicates", async () => {
  const originalAggregate = WorkOrder.aggregate;
  const originalDeleteMany = WorkOrder.deleteMany;

  let deleteQuery = null;
  WorkOrder.aggregate = async () => ([
    {
      _id: { pmScheduleId: "a1", pmTriggeredValue: 100 },
      ids: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      count: 2,
    },
  ]);
  WorkOrder.deleteMany = async (query) => {
    deleteQuery = query;
    return { deletedCount: 1 };
  };

  const removed = await autoFixDuplicatePmWorkOrders();

  assert.equal(removed, 1);
  assert.deepEqual(deleteQuery, {
    _id: { $in: ["507f1f77bcf86cd799439011"] },
  });

  WorkOrder.aggregate = originalAggregate;
  WorkOrder.deleteMany = originalDeleteMany;
});

test("autoFixDuplicatePmWorkOrders is no-op when no duplicates", async () => {
  const originalAggregate = WorkOrder.aggregate;
  const originalDeleteMany = WorkOrder.deleteMany;
  let deleteCalled = false;

  WorkOrder.aggregate = async () => ([]);
  WorkOrder.deleteMany = async () => {
    deleteCalled = true;
    return { deletedCount: 0 };
  };

  const removed = await autoFixDuplicatePmWorkOrders();

  assert.equal(removed, 0);
  assert.equal(deleteCalled, false);

  WorkOrder.aggregate = originalAggregate;
  WorkOrder.deleteMany = originalDeleteMany;
});
