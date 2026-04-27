const mongoose = require("mongoose");

const maintenanceLogSchema = new mongoose.Schema(
  {
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: true,
      unique: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: { type: Date, default: Date.now },
    laborHours: { type: Number, default: 0 },
    findings: { type: String, default: "" },
    shotAtMaintenance: { type: Number, default: null },
  },
  { versionKey: false }
);

maintenanceLogSchema.index({ assetId: 1, completedAt: -1 });

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
