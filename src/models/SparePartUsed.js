const mongoose = require("mongoose");

const sparePartUsedSchema = new mongoose.Schema(
  {
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: true,
    },
    partName: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { versionKey: false }
);

sparePartUsedSchema.index({ workOrderId: 1 });

module.exports = mongoose.model("SparePartUsed", sparePartUsedSchema);
