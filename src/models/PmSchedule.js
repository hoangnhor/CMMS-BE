const mongoose = require("mongoose");
const Asset = require("./Asset");
const { httpError } = require("../utils/httpError");

const triggerTypes = ["hours", "shots", "days", "usage_count"];
const compatibleTriggers = {
  machine: ["hours", "days"],
  mold: ["shots"],
  jig_tool: ["usage_count", "days"],
  infrastructure: ["days"],
};

const pmScheduleSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    triggerType: { type: String, enum: triggerTypes, required: true },
    intervalValue: { type: Number, required: true, min: 1 },
    lastTriggeredValue: { type: Number, default: 0 },
    nextDueValue: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { versionKey: false }
);

pmScheduleSchema.index({ assetId: 1, isActive: 1 });
pmScheduleSchema.index({ isActive: 1, nextDueValue: 1 });
pmScheduleSchema.index({ triggerType: 1, isActive: 1 });

pmScheduleSchema.pre("validate", async function validateSchedule() {
  const asset = await Asset.findById(this.assetId).lean();
  if (!asset) throw httpError(404, "Không tìm thấy tài sản cho lịch PM");
  if (asset.status === "disposed") {
    throw httpError(400, "Tài sản đã thanh lý, không thể tạo lịch PM");
  }

  const allowed = compatibleTriggers[asset.assetType] || [];
  if (!allowed.includes(this.triggerType)) {
    throw httpError(
      400,
      `triggerType ${this.triggerType} không phù hợp với assetType ${asset.assetType}`
    );
  }

  this.nextDueValue = (this.lastTriggeredValue || 0) + this.intervalValue;
});

module.exports = mongoose.model("PmSchedule", pmScheduleSchema);
