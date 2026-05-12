const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const { httpError } = require("../utils/httpError");
const {
  buildWorkOrderFilter,
  canViewWorkOrder,
} = require("./workOrderPolicy.service");
const { parsePagination } = require("../utils/pagination");

const MAX_KEYWORD_LENGTH = 80;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findWorkOrderOrThrow(id) {
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw httpError(404, "Không tìm thấy Work Order");
  return workOrder;
}

async function listWorkOrders(query, actor) {
  const { page, limit, skip, paginated } = parsePagination(query || {});
  const filter = buildWorkOrderFilter(query, actor);

  if (query?.keyword?.trim()) {
    const safeKeyword = escapeRegex(
      String(query.keyword).trim().slice(0, MAX_KEYWORD_LENGTH)
    );
    filter.woCode = { $regex: safeKeyword, $options: "i" };
  }

  if (!paginated) {
    return WorkOrder.find(filter)
      .sort({ _id: -1 })
      .populate("assetId", "assetCode name assetType status")
      .populate("createdBy", "name role")
      .populate("assignedTo", "name role")
      .lean();
  }

  const [items, total] = await Promise.all([
    WorkOrder.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assetId", "assetCode name assetType status")
      .populate("createdBy", "name role")
      .populate("assignedTo", "name role")
      .lean(),
    WorkOrder.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
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

module.exports = {
  findWorkOrderOrThrow,
  listWorkOrders,
  getWorkOrderById,
};
