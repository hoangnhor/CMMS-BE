const express = require("express");
const controller = require("../controllers/pmSchedule.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validateObjectIdParam = require("../middleware/validateObjectId");

const router = express.Router();

router.use(auth, role("admin", "site_manager"));
router.get("/", controller.list);
router.get("/:id", validateObjectIdParam("id"), controller.getById);
router.post("/", controller.create);
router.put("/:id", validateObjectIdParam("id"), controller.update);

module.exports = router;
