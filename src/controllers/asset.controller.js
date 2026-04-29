const assetService = require("../services/asset.service");
const { emitRealtime } = require("../realtime/io");

function emitAssetChanged(action, id, assetCode = null) {
  emitRealtime("asset.changed", {
    action,
    id,
    assetCode,
  });
}

function withHandler(execute) {
  return async function handler(req, res, next) {
    try {
      await execute(req, res);
    } catch (error) {
      next(error);
    }
  };
}

const createAsset = withHandler(async (req, res) => {
  const data = await assetService.createAsset(req.body);
  emitAssetChanged("created", data?.asset?._id || null, data?.asset?.assetCode || null);
  res.status(201).json({ success: true, data });
});

const listAssets = withHandler(async (req, res) => {
  const data = await assetService.listAssets(req.query, req.user);
  res.json({ success: true, data });
});

const getAssetById = withHandler(async (req, res) => {
  const data = await assetService.getAssetById(req.params.id, req.user);
  res.json({ success: true, data });
});

const updateAsset = withHandler(async (req, res) => {
  const data = await assetService.updateAsset(req.params.id, req.body);
  emitAssetChanged("updated", req.params.id, data?.asset?.assetCode || null);
  res.json({ success: true, data });
});

const deleteAsset = withHandler(async (req, res) => {
  const data = await assetService.deleteAsset(req.params.id);
  emitAssetChanged("deleted", req.params.id);
  res.json({ success: true, data });
});

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
};
