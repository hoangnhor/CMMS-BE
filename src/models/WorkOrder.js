const mongoose = require("mongoose");

const woTypes = ["PM", "CM"];
const triggerSources = ["machine_alert", "pm_schedule", "production_request"];
const priorities = ["urgent", "high", "medium", "low"];
const statuses = [
  "draft",
  "pending_approval",
  "approved",
  "in_progress",
  "done",
  "rejected",
];

const workOrderSchema = new mongoose.Schema(
  {
    woCode: { type: String, required: true, unique: true },
    woType: { type: String, enum: woTypes, required: true },
    triggerSource: { type: String, enum: triggerSources, required: true },
    priority: { type: String, enum: priorities, required: true },
    status: { type: String, enum: statuses, default: "draft" },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedReason: { type: String, default: "" },
    scheduledDate: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    laborHours: { type: Number, default: 0 },
    qcSignOff: { type: Boolean, default: false },
  },
  { versionKey: false }
);

workOrderSchema.index({ assetId: 1, status: 1 });
workOrderSchema.index({ priority: 1, status: 1 });
workOrderSchema.index({ assignedTo: 1, status: 1 });
workOrderSchema.index({ triggerSource: 1, status: 1 });

module.exports = mongoose.model("WorkOrder", workOrderSchema);
