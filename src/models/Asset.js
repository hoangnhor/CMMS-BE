const mongoose = require("mongoose");

const assetTypes = ["machine", "mold", "jig_tool", "infrastructure"];
const assetStatuses = ["active", "in_repair", "idle", "disposed"];

const assetSchema = new mongoose.Schema(
  {
    assetCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    assetType: { type: String, enum: assetTypes, required: true },
    status: { type: String, enum: assetStatuses, default: "active" },
    purchaseDate: { type: Date, default: null },
    purchasePrice: { type: Number, default: null },
    location: { type: String, default: "" },
    manufacturer: { type: String, default: "" },
    model: { type: String, default: "" },
    serialNumber: { type: String, default: "" },
  },
  { versionKey: false }
);

assetSchema.index({ status: 1, assetType: 1 });
assetSchema.index({ name: 1 });
assetSchema.index({ location: 1 });

module.exports = mongoose.model("Asset", assetSchema);
