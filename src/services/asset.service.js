const Asset = require("../models/Asset");
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
} = require("./assetDetail.service");
const { hardDeleteAssetById } = require("./assetCascadeDelete.service");

async function findAssetOrThrow(id, { lean = false } = {}) {
  const query = Asset.findById(id);
  const asset = lean ? await query.lean() : await query;
  if (!asset) throw httpError(404, "Không tìm thấy tài sản");
  return asset;
}

async function createAsset(payload) {
  const { assetData, detail } = normalizeAssetPayload(payload, { create: true });
  const existed = await Asset.findOne({ assetCode: assetData.assetCode }).lean();

  if (existed) {
    if (existed.status === "disposed") {
      await hardDeleteAssetById(existed);
    } else {
      throw httpError(409, "Mã tài sản đã tồn tại");
    }
  }

  const asset = await Asset.create(assetData);
  const detailDoc = await createAssetDetail(asset, detail);
  return { asset, detail: detailDoc };
}

async function listAssets(query = {}, actor = null) {
  const rows = await Asset.find(buildAssetFilter(query))
    .sort({ _id: -1 })
    .lean();

  rows.forEach((item) => stripAssetCost(item, actor));
  return rows;
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

  Object.assign(current, assetData);
  const savedAsset = await current.save();
  const detailDoc = await upsertAssetDetail(savedAsset, detail);
  return { asset: savedAsset.toObject(), detail: detailDoc };
}

async function deleteAsset(id) {
  const current = await findAssetOrThrow(id, { lean: true });
  await hardDeleteAssetById(current);
  return { id };
}

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
};
