const mongoose = require("mongoose");
const { httpError } = require("../utils/httpError");
const {
  assertAllowedFields,
  assertPlainObject,
  normalizeBoolean,
  normalizeDate,
  normalizeNumber,
  requireEnum,
} = require("../utils/validators");
const {
  woTypes,
  triggerSources,
  priorities,
  WORK_ORDER_MUTABLE_FIELDS,
  WORK_ORDER_APPROVE_FIELDS,
  WORK_ORDER_REJECT_FIELDS,
  WORK_ORDER_COMPLETE_FIELDS,
  WORK_ORDER_SIGNOFF_FIELDS,
  ensureAssetExists,
  assertCanEditDraftRejected,
  assertReviewPermission,
  assignTechnicianForApproval,
  assertTechnicianActor,
  assertAssignedTechnician,
} = require("./workOrderPolicy.service");
const {
  normalizeSpareParts,
  syncSparePartsUsed,
  upsertCompletionLog,
} = require("./workOrderCompletion.service");
const { findWorkOrderOrThrow } = require("./workOrderQuery.service");

async function updateWorkOrder(id, payload, actor) {
  const wo = await findWorkOrderOrThrow(id);

  if (!["draft", "rejected"].includes(wo.status)) {
    throw httpError(400, "Chỉ WO trạng thái draft/rejected mới được chỉnh sửa");
  }

  assertCanEditDraftRejected(actor, wo);
  assertAllowedFields(payload, WORK_ORDER_MUTABLE_FIELDS, "Work Order");

  if (payload.woType !== undefined) {
    wo.woType = requireEnum(payload.woType, woTypes, "Loại Work Order");
  }
  if (payload.triggerSource !== undefined) {
    wo.triggerSource = requireEnum(payload.triggerSource, triggerSources, "Nguồn tạo Work Order");
  }
  if (payload.priority !== undefined) {
    wo.priority = requireEnum(payload.priority, priorities, "Độ ưu tiên");
  }
  if (payload.assetId !== undefined) {
    wo.assetId = await ensureAssetExists(payload.assetId);
  }
  if (payload.scheduledDate !== undefined) {
    wo.scheduledDate = normalizeDate(payload.scheduledDate, "Ngày dự kiến");
  }

  await wo.save();
  return wo.toObject();
}

async function submitForApproval(id, actor) {
  const wo = await findWorkOrderOrThrow(id);
  if (wo.status !== "draft") throw httpError(400, "Chỉ WO draft mới được gửi duyệt");

  assertCanEditDraftRejected(actor, wo);

  wo.status = "pending_approval";
  await wo.save();
  return wo.toObject();
}

async function approveWorkOrder(id, payload, actor) {
  assertAllowedFields(payload || {}, WORK_ORDER_APPROVE_FIELDS, "Thông tin duyệt Work Order");
  const wo = await findWorkOrderOrThrow(id);

  assertReviewPermission(actor, wo, "duyệt");
  await assignTechnicianForApproval(wo, payload || {}, actor);

  wo.status = "approved";
  wo.approvedBy = actor._id;
  wo.rejectedReason = "";
  await wo.save();
  return wo.toObject();
}

async function rejectWorkOrder(id, payload, actor) {
  assertAllowedFields(payload || {}, WORK_ORDER_REJECT_FIELDS, "Thông tin từ chối Work Order");
  const wo = await findWorkOrderOrThrow(id);

  if (!payload.rejectedReason || !payload.rejectedReason.trim()) {
    throw httpError(400, "Bắt buộc truyền rejectedReason");
  }

  assertReviewPermission(actor, wo, "từ chối");

  wo.status = "rejected";
  wo.rejectedReason = payload.rejectedReason.trim();
  wo.approvedBy = null;
  await wo.save();
  return wo.toObject();
}

async function startWorkOrder(id, actor) {
  const wo = await findWorkOrderOrThrow(id);
  assertTechnicianActor(actor, "Chỉ technician mới được bắt đầu WO");
  if (wo.status !== "approved") throw httpError(400, "WO phải được duyệt trước khi bắt đầu");

  if (!wo.assignedTo && wo.priority === "urgent") {
    wo.assignedTo = actor._id;
  } else {
    assertAssignedTechnician(wo, actor, "Technician chỉ được bắt đầu WO đã được phân công cho mình");
  }

  wo.status = "in_progress";
  wo.startedAt = new Date();
  await wo.save();
  return wo.toObject();
}

async function completeWorkOrder(id, payload, actor) {
  assertPlainObject(payload, "Thông tin hoàn thành Work Order");
  assertAllowedFields(payload, WORK_ORDER_COMPLETE_FIELDS, "Thông tin hoàn thành Work Order");
  const wo = await findWorkOrderOrThrow(id);
  assertTechnicianActor(actor, "Chỉ technician mới được hoàn thành WO");
  if (wo.status !== "in_progress") {
    throw httpError(400, "WO phải ở trạng thái in_progress mới được hoàn thành");
  }
  assertAssignedTechnician(wo, actor, "Technician chỉ được hoàn thành WO đã được phân công cho mình");

  const laborHours = normalizeNumber(payload.laborHours || 0, "Giờ công", { min: 0 });
  const spareParts = normalizeSpareParts(payload.spareParts);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      wo.$session(session);
      wo.status = "done";
      wo.completedAt = new Date();
      wo.laborHours = laborHours;
      await wo.save({ session });

      await upsertCompletionLog(wo, actor._id, payload, laborHours, { session });
      await syncSparePartsUsed(wo._id, spareParts, { session });
    });
  } finally {
    await session.endSession();
  }

  return wo.toObject();
}

async function signOffWorkOrder(id, payload, actor) {
  assertAllowedFields(payload || {}, WORK_ORDER_SIGNOFF_FIELDS, "Thông tin sign-off");
  const wo = await findWorkOrderOrThrow(id);
  if (!["admin", "technician"].includes(actor.role)) {
    throw httpError(403, "Chỉ admin/tổ trưởng bảo trì mới được sign-off WO");
  }
  if (wo.status !== "done") throw httpError(400, "WO phải ở trạng thái done trước khi sign-off");

  wo.qcSignOff = Boolean(normalizeBoolean(payload.qcSignOff, "qcSignOff"));
  await wo.save();
  return wo.toObject();
}

module.exports = {
  updateWorkOrder,
  submitForApproval,
  approveWorkOrder,
  rejectWorkOrder,
  startWorkOrder,
  completeWorkOrder,
  signOffWorkOrder,
};
