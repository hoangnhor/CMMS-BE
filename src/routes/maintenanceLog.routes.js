const express = require("express");
const controller = require("../controllers/maintenanceLog.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validateObjectIdParam = require("../middleware/validateObjectId");

const router = express.Router();

router.use(auth, role("admin", "site_manager", "accountant"));
router.get("/", controller.list);
router.get("/:id", validateObjectIdParam("id"), controller.getById);

module.exports = router;
