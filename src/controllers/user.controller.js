const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { emitRealtime } = require("../realtime/io");
const {
  assertAllowedFields,
  normalizeBoolean,
  requireEmail,
  requireEnum,
  requirePassword,
  requireString,
} = require("../utils/validators");

const userRoles = ["admin", "site_manager", "technician", "accountant"];

async function listUsers(req, res, next) {
  try {
    const users = await User.find({}).select("-passwordHash").sort({ _id: -1 }).lean();
    return res.json({ success: true, data: users });
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    assertAllowedFields(req.body, ["name", "email", "password", "role"], "Thông tin người dùng");
    const name = requireString(req.body.name, "Họ tên", { max: 120 });
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);
    const role = requireEnum(req.body.role, userRoles, "Vai trò");

    const exists = await User.findOne({ email }).lean();
    if (exists) return res.status(409).json({ success: false, message: "Email đã tồn tại" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: String(email).toLowerCase(),
      passwordHash,
      role,
      isActive: true,
    });

    emitRealtime("user.changed", {
      action: "created",
      id: user?._id || null,
      email: user?.email || null,
    });

    return res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    assertAllowedFields(req.body, ["isActive"], "Trạng thái người dùng");
    const isActive = normalizeBoolean(req.body.isActive, "isActive");
    if (isActive === undefined) {
      return res.status(400).json({ success: false, message: "isActive là bắt buộc" });
    }
    if (String(req.params.id) === String(req.user._id) && isActive === false) {
      return res.status(400).json({ success: false, message: "Không thể khóa chính tài khoản đang đăng nhập" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { returnDocument: "after", runValidators: true }
    )
      .select("-passwordHash")
      .lean();

    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    emitRealtime("user.changed", {
      action: "status_updated",
      id: user?._id || req.params.id,
      isActive: user?.isActive,
    });
    return res.json({ success: true, data: user });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUserStatus,
};

