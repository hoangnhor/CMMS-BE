const WorkOrder = require("../models/WorkOrder");
const PmSchedule = require("../models/PmSchedule");
const mongoose = require("mongoose");
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
  const session = await mongoose.startSession();
  let currentValueForDuplicate = null;
  try {
    let result = null;
    await session.withTransaction(async () => {
      const schedule = await PmSchedule.findById(scheduleId).populate("assetId").session(session);
      if (!schedule) throw httpError(404, "Không tìm thấy lịch PM");
      if (!schedule.isActive) throw httpError(400, "Lịch PM đang ở trạng thái inactive");
      if (!schedule.assetId) throw httpError(404, "Không tìm thấy tài sản cho lịch PM");
      if (schedule.assetId.status === "disposed") {
        throw httpError(400, "Tài sản đã thanh lý, không thể sinh Work Order PM");
      }

      const currentValue = await getCurrentTriggerValue(schedule, schedule.assetId.assetType);
      currentValueForDuplicate = currentValue;
      if (!isDue(schedule, currentValue)) {
        throw httpError(400, "Lịch PM chưa đến ngưỡng sinh Work Order.");
      }

      const creatorId = await resolvePmCreatorId(actorId);

      const existed = await WorkOrder.findOne({
        pmScheduleId: schedule._id,
        pmTriggeredValue: currentValue,
      }).session(session).lean();
      if (existed) {
        result = existed;
        return;
      }

      const [wo] = await WorkOrder.create(
        [{
          woCode: await generateWoCode("WO"),
          woType: "PM",
          triggerSource: "pm_schedule",
          priority: "medium",
          assetId: schedule.assetId._id,
          createdBy: creatorId,
          status: "draft",
          pmScheduleId: schedule._id,
          pmTriggeredValue: currentValue,
        }],
        { session }
      );

      schedule.lastTriggeredValue = currentValue;
      schedule.nextDueValue = currentValue + schedule.intervalValue;
      await schedule.save({ session });

      result = wo.toObject();
    });
    return result;
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await WorkOrder.findOne({
        pmScheduleId: scheduleId,
        pmTriggeredValue: currentValueForDuplicate,
      }).lean();
      if (duplicate) return duplicate;
    }
    throw error;
  } finally {
    await session.endSession();
  }
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
