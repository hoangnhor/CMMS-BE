const cron = require("node-cron");
const PmSchedule = require("../models/PmSchedule");
const Asset = require("../models/Asset");
const { getCurrentTriggerValue, isDue } = require("../services/pmEngine.service");
const workOrderService = require("../services/workOrder.service");

function startPmCheckerJob(cronExpr, systemUserId = null) {
  return cron.schedule(cronExpr, async () => {
    try {
      const schedules = await PmSchedule.find({ isActive: true }).populate("assetId");
      for (const schedule of schedules) {
        const asset = schedule.assetId || (await Asset.findById(schedule.assetId));
        if (!asset) continue;

        const currentValue = await getCurrentTriggerValue(schedule, asset.assetType);
        if (!isDue(schedule, currentValue)) continue;

        try {
          await workOrderService.createWorkOrderFromPmSchedule(
            schedule._id,
            systemUserId
          );
        } catch (error) {
          // Keep job running but log enough context for debugging.
          console.warn("[pmChecker.job] bo qua tao WO", {
            scheduleId: String(schedule._id),
            assetId: String(asset._id),
            message: error?.message || "unknown_error",
          });
        }
      }
    } catch (error) {
      // Keep job alive even if one tick fails.
      console.error("[pmChecker.job] loi:", error.message);
    }
  });
}

module.exports = { startPmCheckerJob };
