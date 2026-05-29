const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const { httpError } = require("../utils/httpError");
const {
  normalizeNumber,
  optionalString,
  requireString,
} = require("../utils/validators");

function normalizeSpareParts(parts) {
  if (parts === undefined) return [];
  if (!Array.isArray(parts)) {
    throw httpError(400, "spareParts phải là danh sách");
  }

  return parts.map((part) => ({
    partName: requireString(part.partName, "Tên phụ tùng", { max: 180 }),
    qty: normalizeNumber(part.qty, "Số lượng phụ tùng", { min: 1, nullable: false }),
    unitCost: normalizeNumber(part.unitCost || 0, "Đơn giá phụ tùng", { min: 0 }),
  }));
}

async function syncSparePartsUsed(workOrderId, spareParts, options = {}) {
  const { session } = options;
  await SparePartUsed.deleteMany({ workOrderId }, { session });
  if (!spareParts.length) return;
  await SparePartUsed.insertMany(
    spareParts.map((part) => ({
      workOrderId,
      partName: part.partName,
      qty: part.qty,
      unitCost: part.unitCost,
    })),
    { session }
  );
}

async function upsertCompletionLog(workOrder, actorId, payload, laborHours, options = {}) {
  const { session } = options;
  await MaintenanceLog.findOneAndUpdate(
    { workOrderId: workOrder._id },
    {
      workOrderId: workOrder._id,
      assetId: workOrder.assetId,
      technicianId: actorId,
      completedAt: workOrder.completedAt,
      laborHours,
      findings: optionalString(payload.findings || "", "Ghi chú hoàn thành", { max: 2000 }) || "",
      shotAtMaintenance: payload.shotAtMaintenance !== undefined
        ? normalizeNumber(payload.shotAtMaintenance, "Shot tại thời điểm bảo trì", { min: 0 })
        : null,
    },
    { upsert: true, returnDocument: "after", session }
  );
}

module.exports = {
  normalizeSpareParts,
  syncSparePartsUsed,
  upsertCompletionLog,
};
