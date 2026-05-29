const dotenv = require("dotenv");
const { connectDb, disconnectDb } = require("../src/config/db");
const WorkOrder = require("../src/models/WorkOrder");

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI là bắt buộc cho check duplicate PM WO");
  }
  await connectDb(mongoUri, {
    shouldSyncIndexesOnBoot: false,
    autoFixPmWoDuplicates: false,
  });

  const duplicates = await WorkOrder.aggregate([
    {
      $match: {
        pmScheduleId: { $type: "objectId" },
        pmTriggeredValue: { $type: "number" },
      },
    },
    {
      $group: {
        _id: { pmScheduleId: "$pmScheduleId", pmTriggeredValue: "$pmTriggeredValue" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $count: "total" },
  ]);

  const total = Number(duplicates[0]?.total || 0);
  if (total > 0) {
    console.error(`[pm-wo-duplicate-check] duplicate groups=${total}`);
    await disconnectDb();
    process.exit(1);
  }

  console.log("[pm-wo-duplicate-check] OK");
  await disconnectDb();
}

run().catch(async (error) => {
  console.error("[pm-wo-duplicate-check] failed:", error?.message || error);
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
  process.exit(1);
});
