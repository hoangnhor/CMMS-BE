const mongoose = require("mongoose");

const machineDetailSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      unique: true,
    },
    spindleHours: { type: Number, default: 0 },
    cycleCount: { type: Number, default: 0 },
    oee_availability: { type: Number, default: 0 },
    oee_performance: { type: Number, default: 0 },
    oee_quality: { type: Number, default: 0 },
    alarmCode: { type: String, default: "" },
    pmIntervalHours: { type: Number, default: 500 },
    pmIntervalDays: { type: Number, default: 90 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("MachineDetail", machineDetailSchema);
