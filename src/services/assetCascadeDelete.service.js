const Asset = require("../models/Asset");
const PmSchedule = require("../models/PmSchedule");
const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const { getDetailModel } = require("./assetDetail.service");

async function hardDeleteAssetById(assetDoc) {
  const workOrders = await WorkOrder.find({ assetId: assetDoc._id })
    .select("_id")
    .lean();
  const workOrderIds = workOrders.map((item) => item._id);
  const DetailModel = getDetailModel(assetDoc.assetType);

  await Promise.all([
    DetailModel.deleteOne({ assetId: assetDoc._id }),
    PmSchedule.deleteMany({ assetId: assetDoc._id }),
    MaintenanceLog.deleteMany({
      $or: [{ assetId: assetDoc._id }, { workOrderId: { $in: workOrderIds } }],
    }),
    SparePartUsed.deleteMany({ workOrderId: { $in: workOrderIds } }),
    WorkOrder.deleteMany({ assetId: assetDoc._id }),
  ]);

  await Asset.deleteOne({ _id: assetDoc._id });
}

module.exports = {
  hardDeleteAssetById,
};
