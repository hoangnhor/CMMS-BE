const mongoose = require("mongoose");

const jigDetailSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      unique: true,
    },
    usageCount: { type: Number, default: 0 },
    sharpenCount: { type: Number, default: 0 },
    sharpenLimit: { type: Number, default: 20 },
    calibrationDate: { type: Date, default: null },
    nextCalibrationDate: { type: Date, default: null },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    checkedOutMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      default: null,
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("JigDetail", jigDetailSchema);
