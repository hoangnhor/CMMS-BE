const express = require("express");
const userController = require("../controllers/user.controller");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const validateObjectIdParam = require("../middleware/validateObjectId");

const router = express.Router();

router.use(auth, role("admin"));
router.get("/", userController.listUsers);
router.post("/", userController.createUser);
router.patch("/:id/status", validateObjectIdParam("id"), userController.updateUserStatus);

module.exports = router;
