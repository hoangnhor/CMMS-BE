const assetService = require("../services/asset.service");
const { emitRealtime } = require("../realtime/io");

async function createAsset(req, res, next) {
  try {
    const data = await assetService.createAsset(req.body);
    emitRealtime("asset.changed", {
      action: "created",
      id: data?.asset?._id || null,
      assetCode: data?.asset?.assetCode || null,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function listAssets(req, res, next) {
  try {
    const data = await assetService.listAssets(req.query, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getAssetById(req, res, next) {
  try {
    const data = await assetService.getAssetById(req.params.id, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function updateAsset(req, res, next) {
  try {
    const data = await assetService.updateAsset(req.params.id, req.body);
    emitRealtime("asset.changed", {
      action: "updated",
      id: req.params.id,
      assetCode: data?.asset?.assetCode || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function deleteAsset(req, res, next) {
  try {
    const data = await assetService.deleteAsset(req.params.id);
    emitRealtime("asset.changed", {
      action: "deleted",
      id: req.params.id,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
};
