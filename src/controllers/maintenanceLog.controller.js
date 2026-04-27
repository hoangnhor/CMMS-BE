const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const { requireObjectId } = require("../utils/validators");

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.assetId) filter.assetId = requireObjectId(req.query.assetId, "assetId");
    if (req.query.technicianId) filter.technicianId = requireObjectId(req.query.technicianId, "technicianId");

    const logs = await MaintenanceLog.find(filter)
      .sort({ completedAt: -1 })
      .populate("assetId", "assetCode name assetType")
      .populate("technicianId", "name role")
      .populate("workOrderId", "woCode")
      .lean();

    if (req.user.role === "accountant") {
      const data = logs.map((log) => ({
        _id: log._id,
        workOrderId: log.workOrderId,
        assetId: log.assetId,
        completedAt: log.completedAt,
        laborHours: log.laborHours,
      }));
      return res.json({ success: true, data });
    }

    return res.json({ success: true, data: logs });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const log = await MaintenanceLog.findById(req.params.id)
      .populate("assetId", "assetCode name assetType")
      .populate("technicianId", "name role")
      .populate("workOrderId", "woCode status")
      .lean();
    if (!log) return res.status(404).json({ success: false, message: "Không tìm thấy nhật ký bảo trì" });

    const parts = await SparePartUsed.find({ workOrderId: log.workOrderId?._id || log.workOrderId }).lean();

    if (req.user.role === "accountant") {
      return res.json({
        success: true,
        data: {
          _id: log._id,
          workOrderId: log.workOrderId,
          assetId: log.assetId,
          completedAt: log.completedAt,
          laborHours: log.laborHours,
          spareParts: parts,
        },
      });
    }

    return res.json({ success: true, data: { ...log, spareParts: parts } });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  getById,
};

