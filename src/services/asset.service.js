const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const PmSchedule = require("../models/PmSchedule");
const { httpError } = require("../utils/httpError");
const {
  normalizeAssetPayload,
  buildAssetFilter,
  stripAssetCost,
} = require("./assetPayload.service");
const {
  findDetailByAsset,
  createAssetDetail,
  upsertAssetDetail,
  getDetailModel,
} = require("./assetDetail.service");
const { parsePagination } = require("../utils/pagination");

async function findAssetOrThrow(id, { lean = false } = {}) {
  const query = Asset.findById(id);
  const asset = lean ? await query.lean() : await query;
  if (!asset) throw httpError(404, "Không tìm thấy tài sản");
  return asset;
}

async function createAsset(payload) {
  const { assetData, detail } = normalizeAssetPayload(payload, { create: true });
  const session = await mongoose.startSession();
  try {
    let result = null;
    await session.withTransaction(async () => {
      const existed = await Asset.findOne({ assetCode: assetData.assetCode }).session(session).lean();
      if (existed) {
        throw httpError(409, "Mã tài sản đã tồn tại");
      }

      const [asset] = await Asset.create([assetData], { session });
      const detailDoc = await createAssetDetail(asset, detail, { session });
      result = { asset, detail: detailDoc };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function listAssets(query = {}, actor = null) {
  const { page, limit, skip, paginated } = parsePagination(query);
  const filter = buildAssetFilter(query);

  if (!paginated) {
    const rows = await Asset.find(filter).sort({ _id: -1 }).lean();
    rows.forEach((item) => stripAssetCost(item, actor));
    return rows;
  }

  const [rows, total] = await Promise.all([
    Asset.find(filter)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Asset.countDocuments(filter),
  ]);
  const statusRows = await Asset.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const summary = {
    active: 0,
    in_repair: 0,
    idle: 0,
    disposed: 0,
  };
  statusRows.forEach((item) => {
    if (summary[item._id] !== undefined) {
      summary[item._id] = item.count;
    }
  });

  rows.forEach((item) => stripAssetCost(item, actor));
  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary,
  };
}

async function getAssetById(id, actor = null) {
  const asset = await findAssetOrThrow(id, { lean: true });
  const detail = await findDetailByAsset(asset, { lean: true });
  return { asset: stripAssetCost(asset, actor), detail };
}

async function updateAsset(id, payload) {
  const current = await findAssetOrThrow(id);
  const { assetData, detail } = normalizeAssetPayload(payload, {
    create: false,
    currentType: current.assetType,
  });

  const session = await mongoose.startSession();
  try {
    let result = null;
    await session.withTransaction(async () => {
      current.$session(session);
      Object.assign(current, assetData);
      const savedAsset = await current.save({ session });
      const detailDoc = await upsertAssetDetail(savedAsset, detail, { session });
      result = { asset: savedAsset.toObject(), detail: detailDoc };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function deleteAsset(id) {
  const current = await findAssetOrThrow(id, { lean: true });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const [workOrderCount, maintenanceLogCount, pmScheduleCount] = await Promise.all([
        WorkOrder.countDocuments({ assetId: current._id }).session(session),
        MaintenanceLog.countDocuments({ assetId: current._id }).session(session),
        PmSchedule.countDocuments({ assetId: current._id }).session(session),
      ]);

      if (workOrderCount > 0 || maintenanceLogCount > 0 || pmScheduleCount > 0) {
        throw httpError(409, "Không thể xóa tài sản đã có lịch sử nghiệp vụ");
      }

      const AssetDetailModel = getDetailModel(current.assetType);
      await AssetDetailModel.deleteOne({ assetId: current._id }).session(session);
      await Asset.deleteOne({ _id: current._id }).session(session);
    });
    return { id };
  } finally {
    await session.endSession();
  }
}

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
};
