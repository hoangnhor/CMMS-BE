const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const { httpError } = require("../utils/httpError");
const {
  buildWorkOrderFilter,
  canViewWorkOrder,
} = require("./workOrderPolicy.service");

async function findWorkOrderOrThrow(id) {
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw httpError(404, "Không tìm thấy Work Order");
  return workOrder;
}

async function listWorkOrders(query, actor) {
  return WorkOrder.find(buildWorkOrderFilter(query, actor))
    .sort({ _id: -1 })
    .populate("assetId", "assetCode name assetType status")
    .populate("createdBy", "name role")
    .populate("assignedTo", "name role")
    .lean();
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
