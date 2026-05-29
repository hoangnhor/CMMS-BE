const mongoose = require("mongoose");
const WorkOrder = require("../models/WorkOrder");

async function findDuplicatePmWorkOrders() {
  return WorkOrder.aggregate([
    {
      $match: {
        pmScheduleId: { $type: "objectId" },
        pmTriggeredValue: { $type: "number" },
      },
    },
    {
      $group: {
        _id: {
          pmScheduleId: "$pmScheduleId",
          pmTriggeredValue: "$pmTriggeredValue",
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);
}

async function assertNoDuplicatePmWorkOrders() {
  const duplicates = await findDuplicatePmWorkOrders();

  if (duplicates.length > 0) {
    const pair = duplicates[0]._id;
    throw new Error(
      `WorkOrder duplicate PM key trước migration: pmScheduleId=${pair.pmScheduleId}, pmTriggeredValue=${pair.pmTriggeredValue}`
    );
  }
}

async function autoFixDuplicatePmWorkOrders() {
  const duplicates = await WorkOrder.aggregate([
    ...[
      {
        $match: {
          pmScheduleId: { $type: "objectId" },
          pmTriggeredValue: { $type: "number" },
        },
      },
      {
        $group: {
          _id: {
            pmScheduleId: "$pmScheduleId",
            pmTriggeredValue: "$pmTriggeredValue",
          },
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ],
  ]);
  let removed = 0;
  for (const row of duplicates) {
    const sorted = row.ids
      .map((id) => String(id))
      .sort((a, b) => b.localeCompare(a));
    const [, ...dropIds] = sorted;
    if (dropIds.length > 0) {
      const result = await WorkOrder.deleteMany({ _id: { $in: dropIds } });
      removed += Number(result?.deletedCount || 0);
    }
  }
  return removed;
}

async function connectDb(
  mongoUri,
  { shouldSyncIndexesOnBoot = false, autoFixPmWoDuplicates = false } = {}
) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  if (autoFixPmWoDuplicates) {
    await autoFixDuplicatePmWorkOrders();
  }
  await assertNoDuplicatePmWorkOrders();
  if (shouldSyncIndexesOnBoot) {
    await WorkOrder.syncIndexes();
  }
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = {
  connectDb,
  disconnectDb,
  autoFixDuplicatePmWorkOrders,
};
