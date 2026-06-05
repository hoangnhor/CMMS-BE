const MachineDetail = require("../models/MachineDetail");
const MoldDetail = require("../models/MoldDetail");
const JigDetail = require("../models/JigDetail");

function dayNumber(date = new Date()) {
  return Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
}

function resolveAssetId(assetRef) {
  if (!assetRef) return null;
  if (typeof assetRef === "object" && assetRef._id) return assetRef._id;
  return assetRef;
}

async function getCurrentTriggerValue(schedule, assetType) {
  const assetId = resolveAssetId(schedule.assetId);
  if (schedule.triggerType === "days") return dayNumber(new Date());

  if (assetType === "machine") {
    const detail = await MachineDetail.findOne({ assetId }).lean();
    if (!detail) return 0;
    return schedule.triggerType === "hours" ? detail.spindleHours || 0 : 0;
  }

  if (assetType === "mold") {
    const detail = await MoldDetail.findOne({ assetId }).lean();
    if (!detail) return 0;
    return schedule.triggerType === "shots" ? detail.totalShots || 0 : 0;
  }

  if (assetType === "jig_tool") {
    const detail = await JigDetail.findOne({ assetId }).lean();
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
  resolveAssetId,
};
