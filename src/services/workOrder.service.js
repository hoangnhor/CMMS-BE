const WorkOrder = require("../models/WorkOrder");
const User = require("../models/User");
const Asset = require("../models/Asset");
const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const PmSchedule = require("../models/PmSchedule");
const { generateWoCode } = require("../utils/generateWoCode");
const { getCurrentTriggerValue, isDue } = require("./pmEngine.service");
const { httpError } = require("../utils/httpError");
const {
  assertAllowedFields,
  assertPlainObject,
  normalizeBoolean,
  normalizeDate,
  normalizeNumber,
  optionalString,
  requireEnum,
  requireObjectId,
  requireString,
} = require("../utils/validators");

const woTypes = ["PM", "CM"];
const triggerSources = ["machine_alert", "pm_schedule", "production_request"];
const priorities = ["urgent", "high", "medium", "low"];
const statuses = ["draft", "pending_approval", "approved", "in_progress", "done", "rejected"];

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

async function createWorkOrder(payload, actor) {
  if (!["admin", "site_manager", "technician"].includes(actor.role)) {
    throw httpError(403, "Vai trò hiện tại không được tạo Work Order");
  }

  assertAllowedFields(payload, ["woType", "triggerSource", "priority", "assetId", "scheduledDate"], "Work Order");
  const assetId = requireObjectId(payload.assetId, "assetId");
  const woType = requireEnum(payload.woType, woTypes, "Loại Work Order");
  const triggerSource = requireEnum(payload.triggerSource, triggerSources, "Nguồn tạo Work Order");
  const priority = requireEnum(payload.priority, priorities, "Độ ưu tiên");
  const scheduledDate = payload.scheduledDate !== undefined ? normalizeDate(payload.scheduledDate, "Ngày dự kiến") : null;

  const asset = await Asset.findById(assetId).lean();
  if (!asset) throw httpError(404, "Không tìm thấy tài sản");

  const wo = await WorkOrder.create({
    woCode: generateWoCode("WO"),
    woType,
    triggerSource,
    priority,
    assetId,
    createdBy: actor._id,
    scheduledDate,
    status: "draft",
  });

  return wo.toObject();
}

async function listWorkOrders(query, actor) {
  const filter = {};
  if (query.status) filter.status = requireEnum(query.status, statuses, "Trạng thái Work Order");
  if (query.priority) filter.priority = requireEnum(query.priority, priorities, "Độ ưu tiên");
  if (query.triggerSource) filter.triggerSource = requireEnum(query.triggerSource, triggerSources, "Nguồn tạo Work Order");
  if (query.assetId) filter.assetId = requireObjectId(query.assetId, "assetId");

  if (actor.role === "technician") {
    filter.$or = [{ createdBy: actor._id }, { assignedTo: actor._id }];
  }

  const rows = await WorkOrder.find(filter)
    .sort({ _id: -1 })
    .populate("assetId", "assetCode name assetType status")
    .populate("createdBy", "name role")
    .populate("assignedTo", "name role")
    .lean();

  return rows;
}

async function getWorkOrderById(id, actor) {
  const wo = await WorkOrder.findById(id)
    .populate("assetId")
    .populate("createdBy", "name role")
    .populate("assignedTo", "name role")
    .populate("approvedBy", "name role")
    .lean();

  if (!wo) throw httpError(404, "Không tìm thấy Work Order");
  if (!canViewWorkOrder(actor, wo)) {
    throw httpError(403, "Bạn không có quyền xem Work Order này.");
  }

  const log = await MaintenanceLog.findOne({ workOrderId: wo._id }).lean();
  const parts = await SparePartUsed.find({ workOrderId: wo._id }).lean();

  if (actor.role === "technician") {
    if (wo.assetId) wo.assetId.purchasePrice = undefined;
    parts.forEach((part) => {
      part.unitCost = undefined;
    });
  }

  return { ...wo, maintenanceLog: log, sparePartsUsed: parts };
}

function assertCanEditDraftRejected(actor, wo) {
  const isOwner = String(wo.createdBy) === String(actor._id);
  if (["admin", "site_manager"].includes(actor.role)) return;
  if (isOwner) return;
  throw httpError(403, "Chỉ người tạo, admin hoặc site_manager mới được sửa WO này.");
}

async function updateWorkOrder(id, payload, actor) {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");

  if (!["draft", "rejected"].includes(wo.status)) {
    throw httpError(400, "Chỉ WO trạng thái draft/rejected mới được chỉnh sửa");
  }

  assertCanEditDraftRejected(actor, wo);

  assertAllowedFields(payload, ["woType", "triggerSource", "priority", "assetId", "scheduledDate"], "Work Order");
  if (payload.woType !== undefined) wo.woType = requireEnum(payload.woType, woTypes, "Loại Work Order");
  if (payload.triggerSource !== undefined) wo.triggerSource = requireEnum(payload.triggerSource, triggerSources, "Nguồn tạo Work Order");
  if (payload.priority !== undefined) wo.priority = requireEnum(payload.priority, priorities, "Độ ưu tiên");
  if (payload.assetId !== undefined) {
    const asset = await Asset.findById(requireObjectId(payload.assetId, "assetId")).lean();
    if (!asset) throw httpError(404, "Không tìm thấy tài sản");
    wo.assetId = payload.assetId;
  }
  if (payload.scheduledDate !== undefined) wo.scheduledDate = normalizeDate(payload.scheduledDate, "Ngày dự kiến");

  await wo.save();
  return wo.toObject();
}

async function submitForApproval(id, actor) {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");
  if (wo.status !== "draft") throw httpError(400, "Chỉ WO draft mới được gửi duyệt");

  assertCanEditDraftRejected(actor, wo);

  wo.status = "pending_approval";
  await wo.save();
  return wo.toObject();
}

async function approveWorkOrder(id, payload, actor) {
  assertAllowedFields(payload || {}, ["assignedTo"], "Thông tin duyệt Work Order");
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");

  if (wo.priority === "urgent") {
    if (!["admin", "site_manager"].includes(actor.role)) {
      throw httpError(403, "Chỉ admin/site_manager mới được duyệt WO khẩn cấp");
    }
    if (!["draft", "pending_approval"].includes(wo.status)) {
      throw httpError(400, "WO khẩn cấp phải ở trạng thái draft hoặc pending_approval để duyệt");
    }
  } else {
    if (!["admin", "technician"].includes(actor.role)) {
      throw httpError(403, "Chỉ admin/tổ trưởng bảo trì mới được duyệt WO không khẩn cấp");
    }
    if (wo.status !== "pending_approval") {
      throw httpError(400, "WO không khẩn cấp phải ở trạng thái pending_approval để duyệt");
    }
  }

  if (wo.priority !== "urgent") {
    if (!payload.assignedTo) {
      throw httpError(400, "Bắt buộc truyền assignedTo khi duyệt Work Order");
    }
    const assignedTo = requireObjectId(payload.assignedTo, "assignedTo");
    const tech = await User.findById(assignedTo).lean();
    if (!tech || tech.role !== "technician") {
      throw httpError(400, "assignedTo phải là technician hợp lệ");
    }
    wo.assignedTo = assignedTo;
  } else if (actor.role === "admin") {
    if (payload.assignedTo) {
      const assignedTo = requireObjectId(payload.assignedTo, "assignedTo");
      const tech = await User.findById(assignedTo).lean();
      if (!tech || tech.role !== "technician") {
        throw httpError(400, "assignedTo phải là technician hợp lệ");
      }
      wo.assignedTo = assignedTo;
    }
  } else if (actor.role === "site_manager") {
    if (payload.assignedTo) {
      throw httpError(400, "site_manager chỉ được duyệt WO khẩn cấp, không được phân công technician");
    }
  }

  wo.status = "approved";
  wo.approvedBy = actor._id;
  wo.rejectedReason = "";
  await wo.save();
  return wo.toObject();
}

async function rejectWorkOrder(id, payload, actor) {
  assertAllowedFields(payload || {}, ["rejectedReason"], "Thông tin từ chối Work Order");
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");

  if (!payload.rejectedReason || !payload.rejectedReason.trim()) {
    throw httpError(400, "Bắt buộc truyền rejectedReason");
  }

  if (wo.priority === "urgent") {
    if (!["admin", "site_manager"].includes(actor.role)) {
      throw httpError(403, "Chỉ admin/site_manager mới được từ chối WO khẩn cấp");
    }
    if (!["draft", "pending_approval"].includes(wo.status)) {
      throw httpError(400, "WO khẩn cấp phải ở trạng thái draft hoặc pending_approval để từ chối");
    }
  } else {
    if (!["admin", "technician"].includes(actor.role)) {
      throw httpError(403, "Chỉ admin/tổ trưởng bảo trì mới được từ chối WO không khẩn cấp");
    }
    if (wo.status !== "pending_approval") {
      throw httpError(400, "WO không khẩn cấp phải ở trạng thái pending_approval để từ chối");
    }
  }

  wo.status = "rejected";
  wo.rejectedReason = payload.rejectedReason.trim();
  wo.approvedBy = null;
  await wo.save();
  return wo.toObject();
}

async function startWorkOrder(id, actor) {
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");
  if (actor.role !== "technician") {
    throw httpError(403, "Chỉ technician mới được bắt đầu WO");
  }
  if (wo.status !== "approved") throw httpError(400, "WO phải được duyệt trước khi bắt đầu");
  if (!wo.assignedTo && wo.priority === "urgent") {
    wo.assignedTo = actor._id;
  } else if (String(wo.assignedTo || "") !== String(actor._id)) {
    throw httpError(403, "Technician chỉ được bắt đầu WO đã được phân công cho mình");
  }

  wo.status = "in_progress";
  wo.startedAt = new Date();
  await wo.save();
  return wo.toObject();
}

async function completeWorkOrder(id, payload, actor) {
  assertPlainObject(payload, "Thông tin hoàn thành Work Order");
  assertAllowedFields(payload, ["laborHours", "findings", "shotAtMaintenance", "spareParts"], "Thông tin hoàn thành Work Order");
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");
  if (actor.role !== "technician") {
    throw httpError(403, "Chỉ technician mới được hoàn thành WO");
  }
  if (wo.status !== "in_progress") {
    throw httpError(400, "WO phải ở trạng thái in_progress mới được hoàn thành");
  }
  if (String(wo.assignedTo || "") !== String(actor._id)) {
    throw httpError(403, "Technician chỉ được hoàn thành WO đã được phân công cho mình");
  }

  wo.status = "done";
  wo.completedAt = new Date();
  const laborHours = normalizeNumber(payload.laborHours || 0, "Giờ công", { min: 0 });
  wo.laborHours = laborHours;
  await wo.save();

  await MaintenanceLog.findOneAndUpdate(
    { workOrderId: wo._id },
    {
      workOrderId: wo._id,
      assetId: wo.assetId,
      technicianId: actor._id,
      completedAt: wo.completedAt,
      laborHours,
      findings: optionalString(payload.findings || "", "Ghi chú hoàn thành", { max: 2000 }) || "",
      shotAtMaintenance: payload.shotAtMaintenance !== undefined
        ? normalizeNumber(payload.shotAtMaintenance, "Shot tại thời điểm bảo trì", { min: 0 })
        : null,
    },
    { upsert: true, returnDocument: "after" }
  );

  if (payload.spareParts !== undefined && !Array.isArray(payload.spareParts)) {
    throw httpError(400, "spareParts phải là danh sách");
  }

  if (Array.isArray(payload.spareParts) && payload.spareParts.length) {
    await SparePartUsed.deleteMany({ workOrderId: wo._id });
    await SparePartUsed.insertMany(
      payload.spareParts.map((part) => ({
        workOrderId: wo._id,
        partName: requireString(part.partName, "Tên phụ tùng", { max: 180 }),
        qty: normalizeNumber(part.qty, "Số lượng phụ tùng", { min: 1, nullable: false }),
        unitCost: normalizeNumber(part.unitCost || 0, "Đơn giá phụ tùng", { min: 0 }),
      }))
    );
  }

  return wo.toObject();
}

async function signOffWorkOrder(id, payload, actor) {
  assertAllowedFields(payload || {}, ["qcSignOff"], "Thông tin sign-off");
  const wo = await WorkOrder.findById(id);
  if (!wo) throw httpError(404, "Không tìm thấy Work Order");
  if (!["admin", "technician"].includes(actor.role)) {
    throw httpError(403, "Chỉ admin/tổ trưởng bảo trì mới được sign-off WO");
  }
  if (wo.status !== "done") throw httpError(400, "WO phải ở trạng thái done trước khi sign-off");

  wo.qcSignOff = Boolean(normalizeBoolean(payload.qcSignOff, "qcSignOff"));
  await wo.save();
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

  let creatorId = actorId;
  if (!creatorId) {
    const admin = await User.findOne({ role: "admin", isActive: true }).lean();
    if (!admin) {
      throw httpError(500, "Không có admin active để hệ thống tạo Work Order.");
    }
    creatorId = admin._id;
  }

  const wo = await WorkOrder.create({
    woCode: generateWoCode("WO"),
    woType: "PM",
    triggerSource: "pm_schedule",
    priority: "medium",
    assetId: schedule.assetId._id,
    createdBy: creatorId,
    status: "draft",
  });

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
