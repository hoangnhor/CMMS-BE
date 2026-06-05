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

async function createAssetDetail(asset, detail, options = {}) {
  const DetailModel = getDetailModel(asset.assetType);
  const { session } = options;
  const docs = await DetailModel.create([{ assetId: asset._id, ...(detail || {}) }], { session });
  return docs[0];
}

async function upsertAssetDetail(asset, detail, options = {}) {
  const DetailModel = getDetailModel(asset.assetType);
  const { session } = options;
  return DetailModel.findOneAndUpdate(
    { assetId: asset._id },
    { $set: detail || {} },
    { returnDocument: "after", upsert: true, session }
  ).lean();
}

module.exports = {
  getDetailModel,
  findDetailByAsset,
  createAssetDetail,
  upsertAssetDetail,
};
