const WorkOrder = require("../models/WorkOrder");
const PmSchedule = require("../models/PmSchedule");
const { generateWoCode } = require("../utils/generateWoCode");
const { getCurrentTriggerValue, isDue } = require("./pmEngine.service");
const { httpError } = require("../utils/httpError");
const {
  normalizeWorkOrderCreatePayload,
  ensureAssetExists,
  resolvePmCreatorId,
} = require("./workOrderPolicy.service");
const {
  listWorkOrders,
  getWorkOrderById,
} = require("./workOrderQuery.service");
const {
  updateWorkOrder,
  submitForApproval,
  approveWorkOrder,
  rejectWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  signOffWorkOrder,
} = require("./workOrderTransition.service");

async function createWorkOrder(payload, actor) {
  if (!["admin", "site_manager", "technician"].includes(actor.role)) {
    throw httpError(403, "Vai trò hiện tại không được tạo Work Order");
  }

  const parsed = normalizeWorkOrderCreatePayload(payload);
  const assetId = await ensureAssetExists(payload.assetId);

  const wo = await WorkOrder.create({
    woCode: await generateWoCode("WO"),
    woType: parsed.woType,
    triggerSource: parsed.triggerSource,
    priority: parsed.priority,
    assetId,
    createdBy: actor._id,
    scheduledDate: parsed.scheduledDate,
    status: "draft",
  });

  return wo.toObject();
}

async function createWorkOrderFromPmSchedule(scheduleId, actorId = null) {
  const schedule = await PmSchedule.findById(scheduleId).populate("assetId");
  if (!schedule) throw httpError(404, "Không tìm thấy lịch PM");
  if (!schedule.isActive) throw httpError(400, "Lịch PM đang ở trạng thái inactive");

  const currentValue = await getCurrentTriggerValue(schedule, schedule.assetId.assetType);
  if (!isDue(schedule, currentValue)) {
    throw httpError(400, "Lịch PM chưa đến ngưỡng sinh Work Order.");
  }

  const creatorId = await resolvePmCreatorId(actorId);

  const existed = await WorkOrder.findOne({
    pmScheduleId: schedule._id,
    pmTriggeredValue: currentValue,
  }).lean();
  if (existed) {
    return existed;
  }

  let wo;
  try {
    wo = await WorkOrder.create({
      woCode: await generateWoCode("WO"),
      woType: "PM",
      triggerSource: "pm_schedule",
      priority: "medium",
      assetId: schedule.assetId._id,
      createdBy: creatorId,
      status: "draft",
      pmScheduleId: schedule._id,
      pmTriggeredValue: currentValue,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await WorkOrder.findOne({
        pmScheduleId: schedule._id,
        pmTriggeredValue: currentValue,
      }).lean();
      if (duplicate) return duplicate;
    }
    throw error;
  }

  schedule.lastTriggeredValue = currentValue;
  schedule.nextDueValue = currentValue + schedule.intervalValue;
  await schedule.save();

  return wo.toObject();
}

module.exports = {
  createWorkOrder,
  listWorkOrders,
  getWorkOrderById,
  updateWorkOrder,
  submitForApproval,
  approveWorkOrder,
  rejectWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  signOffWorkOrder,
  createWorkOrderFromPmSchedule,
};
