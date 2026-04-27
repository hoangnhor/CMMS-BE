const mongoose = require("mongoose");

const infraDetailSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      unique: true,
    },
    operatingHours: { type: Number, default: 0 },
    pmIntervalDays: { type: Number, default: 180 },
    lastInspectionDate: { type: Date, default: null },
    nextInspectionDate: { type: Date, default: null },
  },
  { versionKey: false }
);

module.exports = mongoose.model("InfraDetail", infraDetailSchema);
