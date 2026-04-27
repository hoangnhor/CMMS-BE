const MachineDetail = require("../models/MachineDetail");
const MoldDetail = require("../models/MoldDetail");
const JigDetail = require("../models/JigDetail");

function dayNumber(date = new Date()) {
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

async function getCurrentTriggerValue(schedule, assetType) {
  if (schedule.triggerType === "days") return dayNumber(new Date());

  if (assetType === "machine") {
    const detail = await MachineDetail.findOne({ assetId: schedule.assetId }).lean();
    if (!detail) return 0;
    return schedule.triggerType === "hours" ? detail.spindleHours || 0 : 0;
  }

  if (assetType === "mold") {
    const detail = await MoldDetail.findOne({ assetId: schedule.assetId }).lean();
    if (!detail) return 0;
    return schedule.triggerType === "shots" ? detail.totalShots || 0 : 0;
  }

  if (assetType === "jig_tool") {
    const detail = await JigDetail.findOne({ assetId: schedule.assetId }).lean();
    if (!detail) return 0;
    return schedule.triggerType === "usage_count" ? detail.usageCount || 0 : 0;
  }

  if (assetType === "infrastructure") {
    return 0;
  }

  return 0;
}

function isDue(schedule, currentValue) {
  return Number(currentValue) >= Number(schedule.nextDueValue || 0);
}

module.exports = {
  dayNumber,
  getCurrentTriggerValue,
  isDue,
};
