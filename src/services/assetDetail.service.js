const MachineDetail = require("../models/MachineDetail");
const MoldDetail = require("../models/MoldDetail");
const JigDetail = require("../models/JigDetail");
const InfraDetail = require("../models/InfraDetail");
const { httpError } = require("../utils/httpError");

function getDetailModel(assetType) {
  if (assetType === "machine") return MachineDetail;
  if (assetType === "mold") return MoldDetail;
  if (assetType === "jig_tool") return JigDetail;
  if (assetType === "infrastructure") return InfraDetail;
  throw httpError(400, "assetType không được hỗ trợ");
}

async function findDetailByAsset(asset, { lean = false } = {}) {
  const DetailModel = getDetailModel(asset.assetType);
  const query = DetailModel.findOne({ assetId: asset._id });
  return lean ? query.lean() : query;
}

async function createAssetDetail(asset, detail) {
  const DetailModel = getDetailModel(asset.assetType);
  return DetailModel.create({ assetId: asset._id, ...(detail || {}) });
}

async function upsertAssetDetail(asset, detail) {
  const DetailModel = getDetailModel(asset.assetType);
  return DetailModel.findOneAndUpdate(
    { assetId: asset._id },
    { $set: detail || {} },
    { returnDocument: "after", upsert: true }
  ).lean();
}

module.exports = {
  getDetailModel,
  findDetailByAsset,
  createAssetDetail,
  upsertAssetDetail,
};
