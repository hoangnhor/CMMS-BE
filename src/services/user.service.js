const bcrypt = require("bcryptjs");
const User = require("../models/User");
const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const { httpError } = require("../utils/httpError");
const {
  assertAllowedFields,
  normalizeBoolean,
  requireEmail,
  requireEnum,
  requirePassword,
  requireString,
} = require("../utils/validators");

const userRoles = ["admin", "site_manager", "technician", "accountant"];

function toUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

async function listUsers() {
  return User.find({}).select("-passwordHash").sort({ _id: -1 }).lean();
}

async function createUser(payload) {
  assertAllowedFields(payload, ["name", "email", "password", "role"], "Thông tin người dùng");
  const name = requireString(payload.name, "Họ tên", { max: 120 });
  const email = requireEmail(payload.email);
  const password = requirePassword(payload.password);
  const role = requireEnum(payload.role, userRoles, "Vai trò");

  const exists = await User.findOne({ email }).lean();
  if (exists) {
    throw httpError(409, "Email đã tồn tại");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    isActive: true,
  });

  return toUserResponse(user);
}

async function updateUserStatus(id, payload, actorId) {
  assertAllowedFields(payload, ["isActive"], "Trạng thái người dùng");
  const isActive = normalizeBoolean(payload.isActive, "isActive");
  if (isActive === undefined) {
    throw httpError(400, "isActive là bắt buộc");
  }
  if (String(id) === String(actorId) && isActive === false) {
    throw httpError(400, "Không thể khóa chính tài khoản đang đăng nhập");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isActive },
    { returnDocument: "after", runValidators: true }
  )
    .select("-passwordHash")
    .lean();

  if (!user) {
    throw httpError(404, "Không tìm thấy người dùng");
  }

  return user;
}

async function deleteUser(id, actorId) {
  if (String(id) === String(actorId)) {
    throw httpError(400, "Không thể xóa chính tài khoản đang đăng nhập");
  }

  const [createdCount, assignedCount, approvedCount, technicianCount] = await Promise.all([
    WorkOrder.countDocuments({ createdBy: id }),
    WorkOrder.countDocuments({ assignedTo: id }),
    WorkOrder.countDocuments({ approvedBy: id }),
    MaintenanceLog.countDocuments({ technicianId: id }),
  ]);

  if (createdCount || assignedCount || approvedCount || technicianCount) {
    throw httpError(
      409,
      "Không thể xóa người dùng đã có lịch sử nghiệp vụ. Hãy khóa tài khoản thay thế."
    );
  }

  const user = await User.findByIdAndDelete(id).select("-passwordHash").lean();
  if (!user) {
    throw httpError(404, "Không tìm thấy người dùng");
  }
  return user;
}

module.exports = {
  listUsers,
  createUser,
  updateUserStatus,
  deleteUser,
};
