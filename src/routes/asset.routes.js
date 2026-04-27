const express = require("express");
const assetController = require("../controllers/asset.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validateObjectIdParam = require("../middleware/validateObjectId");

const router = express.Router();

router.use(auth);
router.get("/", assetController.listAssets);
router.get("/:id", validateObjectIdParam("id"), assetController.getAssetById);
router.post("/", role("admin", "site_manager"), assetController.createAsset);
router.put("/:id", validateObjectIdParam("id"), role("admin", "site_manager"), assetController.updateAsset);
router.delete("/:id", validateObjectIdParam("id"), role("admin", "site_manager"), assetController.deleteAsset);

module.exports = router;
