const User = require("../models/User");
const Asset = require("../models/Asset");
const { httpError } = require("../utils/httpError");
const {
  assertAllowedFields,
  normalizeDate,
  requireEnum,
  requireObjectId,
} = require("../utils/validators");

const woTypes = ["PM", "CM"];
const triggerSources = ["machine_alert", "pm_schedule", "production_request"];
const priorities = ["urgent", "high", "medium", "low"];
const statuses = ["draft", "pending_approval", "approved", "in_progress", "done", "rejected"];
const WORK_ORDER_MUTABLE_FIELDS = ["woType", "triggerSource", "priority", "assetId", "scheduledDate"];
const WORK_ORDER_APPROVE_FIELDS = ["assignedTo"];
const WORK_ORDER_REJECT_FIELDS = ["rejectedReason"];
const WORK_ORDER_COMPLETE_FIELDS = ["laborHours", "findings", "shotAtMaintenance", "spareParts"];
const WORK_ORDER_SIGNOFF_FIELDS = ["qcSignOff"];

async function ensureAssetExists(assetId) {
  const resolvedAssetId = requireObjectId(assetId, "assetId");
  const asset = await Asset.findById(resolvedAssetId).lean();
  if (!asset) throw httpError(404, "Không tìm thấy tài sản");
  return resolvedAssetId;
}

function buildWorkOrderFilter(query, actor) {
  const filter = {};
  if (query.status) filter.status = requireEnum(query.status, statuses, "Trạng thái Work Order");
  if (query.priority) filter.priority = requireEnum(query.priority, priorities, "Độ ưu tiên");
  if (query.triggerSource) filter.triggerSource = requireEnum(query.triggerSource, triggerSources, "Nguồn tạo Work Order");
  if (query.assetId) filter.assetId = requireObjectId(query.assetId, "assetId");

  if (actor.role === "technician") {
    filter.$or = [{ createdBy: actor._id }, { assignedTo: actor._id }];
  }

  return filter;
}

function canViewWorkOrder(actor, workOrder) {
  if (["admin", "site_manager", "accountant"].includes(actor.role)) return true;
  if (actor.role === "technician") {
    return (
      String(workOrder.createdBy) === String(actor._id) ||
      String(workOrder.assignedTo || "") === String(actor._id)
    );
  }
  return false;
}

function normalizeWorkOrderCreatePayload(payload) {
  assertAllowedFields(payload, WORK_ORDER_MUTABLE_FIELDS, "Work Order");
  return {
    woType: requireEnum(payload.woType, woTypes, "Loại Work Order"),
    triggerSource: requireEnum(payload.triggerSource, triggerSources, "Nguồn tạo Work Order"),
    priority: requireEnum(payload.priority, priorities, "Độ ưu tiên"),
    scheduledDate: payload.scheduledDate !== undefined ? normalizeDate(payload.scheduledDate, "Ngày dự kiến") : null,
  };
}

function assertCanEditDraftRejected(actor, wo) {
  const isOwner = String(wo.createdBy) === String(actor._id);
  if (["admin", "site_manager"].includes(actor.role)) return;
  if (isOwner) return;
  throw httpError(403, "Chỉ người tạo, admin hoặc site_manager mới được sửa WO này.");
}

function assertReviewPermission(actor, wo, actionName) {
  if (wo.priority === "urgent") {
    if (!["admin", "site_manager"].includes(actor.role)) {
      throw httpError(403, `Chỉ admin/site_manager mới được ${actionName} WO khẩn cấp`);
    }
    if (!["draft", "pending_approval"].includes(wo.status)) {
      throw httpError(400, `WO khẩn cấp phải ở trạng thái draft hoặc pending_approval để ${actionName}`);
    }
    return;
  }

  if (!["admin", "technician"].includes(actor.role)) {
    throw httpError(403, `Chỉ admin/tổ trưởng bảo trì mới được ${actionName} WO không khẩn cấp`);
  }
  if (wo.status !== "pending_approval") {
    throw httpError(400, `WO không khẩn cấp phải ở trạng thái pending_approval để ${actionName}`);
  }
}

async function assignTechnicianForApproval(wo, payload, actor) {
  if (wo.priority !== "urgent") {
    if (!payload.assignedTo) {
      throw httpError(400, "Bắt buộc truyền assignedTo khi duyệt Work Order");
    }
    const assignedTo = requireObjectId(payload.assignedTo, "assignedTo");
    const technician = await User.findById(assignedTo).lean();
    if (!technician || technician.role !== "technician") {
      throw httpError(400, "assignedTo phải là technician hợp lệ");
    }
    wo.assignedTo = assignedTo;
    return;
  }

  if (actor.role === "site_manager" && payload.assignedTo) {
    throw httpError(400, "site_manager chỉ được duyệt WO khẩn cấp, không được phân công technician");
  }

  if (actor.role === "admin" && payload.assignedTo) {
    const assignedTo = requireObjectId(payload.assignedTo, "assignedTo");
    const technician = await User.findById(assignedTo).lean();
    if (!technician || technician.role !== "technician") {
      throw httpError(400, "assignedTo phải là technician hợp lệ");
    }
    wo.assignedTo = assignedTo;
  }
}

function assertTechnicianActor(actor, message) {
  if (actor.role !== "technician") {
    throw httpError(403, message);
  }
}

function assertAssignedTechnician(wo, actor, message) {
  if (String(wo.assignedTo || "") !== String(actor._id)) {
    throw httpError(403, message);
  }
}

async function resolvePmCreatorId(actorId) {
  if (actorId) return actorId;

  const admin = await User.findOne({ role: "admin", isActive: true }).lean();
  if (!admin) {
    throw httpError(500, "Không có admin active để hệ thống tạo Work Order.");
  }
  return admin._id;
}

module.exports = {
  woTypes,
  triggerSources,
  priorities,
  statuses,
  WORK_ORDER_MUTABLE_FIELDS,
  WORK_ORDER_APPROVE_FIELDS,
  WORK_ORDER_REJECT_FIELDS,
  WORK_ORDER_COMPLETE_FIELDS,
  WORK_ORDER_SIGNOFF_FIELDS,
  ensureAssetExists,
  buildWorkOrderFilter,
  canViewWorkOrder,
  normalizeWorkOrderCreatePayload,
  assertCanEditDraftRejected,
  assertReviewPermission,
  assignTechnicianForApproval,
  assertTechnicianActor,
  assertAssignedTechnician,
  resolvePmCreatorId,
};
