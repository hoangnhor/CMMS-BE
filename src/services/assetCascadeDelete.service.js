const Asset = require("../models/Asset");
const PmSchedule = require("../models/PmSchedule");
const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const mongoose = require("mongoose");
const { getDetailModel } = require("./assetDetail.service");

async function cascadeDeleteWithSession(assetDoc, session) {
  const workOrders = await WorkOrder.find({ assetId: assetDoc._id }, { _id: 1 }, { session }).lean();
  const workOrderIds = workOrders.map((item) => item._id);
  const DetailModel = getDetailModel(assetDoc.assetType);

  await Promise.all([
    DetailModel.deleteOne({ assetId: assetDoc._id }, { session }),
    PmSchedule.deleteMany({ assetId: assetDoc._id }, { session }),
    MaintenanceLog.deleteMany(
      {
        $or: [{ assetId: assetDoc._id }, { workOrderId: { $in: workOrderIds } }],
      },
      { session }
    ),
    SparePartUsed.deleteMany({ workOrderId: { $in: workOrderIds } }, { session }),
    WorkOrder.deleteMany({ assetId: assetDoc._id }, { session }),
    Asset.deleteOne({ _id: assetDoc._id }, { session }),
  ]);
}

async function hardDeleteAssetById(assetDoc) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await cascadeDeleteWithSession(assetDoc, session);
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  cascadeDeleteWithSession,
  hardDeleteAssetById,
};
