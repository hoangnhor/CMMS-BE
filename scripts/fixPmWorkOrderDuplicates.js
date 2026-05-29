const dotenv = require("dotenv");
const { connectDb, disconnectDb, autoFixDuplicatePmWorkOrders } = require("../src/config/db");

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI là bắt buộc cho migrate duplicate PM WO");
  }
  await connectDb(mongoUri, {
    shouldSyncIndexesOnBoot: false,
    autoFixPmWoDuplicates: false,
  });
  const removed = await autoFixDuplicatePmWorkOrders();
  console.log(`[pm-wo-duplicate-fix] removed=${removed}`);
  await disconnectDb();
}

run().catch(async (error) => {
  console.error("[pm-wo-duplicate-fix] failed:", error?.message || error);
  try {
    await disconnectDb();
  } catch {
    // ignore
  }
  process.exit(1);
});
