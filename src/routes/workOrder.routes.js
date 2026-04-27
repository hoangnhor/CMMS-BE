const express = require("express");
const controller = require("../controllers/workOrder.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validateObjectIdParam = require("../middleware/validateObjectId");

const router = express.Router();
router.use(auth);

router.get("/", role("admin", "site_manager", "technician", "accountant"), controller.list);
router.get("/:id", validateObjectIdParam("id"), role("admin", "site_manager", "technician", "accountant"), controller.getById);
router.post("/", role("admin", "site_manager", "technician"), controller.create);
router.put("/:id", validateObjectIdParam("id"), role("admin", "site_manager", "technician"), controller.update);
router.put("/:id/submit", validateObjectIdParam("id"), role("admin", "site_manager", "technician"), controller.submit);
router.put("/:id/approve", validateObjectIdParam("id"), role("admin", "site_manager", "technician"), controller.approve);
router.put("/:id/reject", validateObjectIdParam("id"), role("admin", "site_manager", "technician"), controller.reject);
router.put("/:id/start", validateObjectIdParam("id"), role("technician"), controller.start);
router.put("/:id/complete", validateObjectIdParam("id"), role("technician"), controller.complete);
router.put("/:id/sign-off", validateObjectIdParam("id"), role("admin", "technician"), controller.signOff);

module.exports = router;
