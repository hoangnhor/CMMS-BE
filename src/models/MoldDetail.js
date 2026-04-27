const mongoose = require("mongoose");

const moldDetailSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      unique: true,
    },
    totalShots: { type: Number, default: 0 },
    shotLimit: { type: Number, default: 500000 },
    currentMachineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      default: null,
    },
    storageLocation: { type: String, default: "" },
    lastMaintenanceShot: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("MoldDetail", moldDetailSchema);
