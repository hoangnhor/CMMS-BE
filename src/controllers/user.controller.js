const userService = require("../services/user.service");
const { emitRealtime } = require("../realtime/io");

function withHandler(execute) {
  return async function handler(req, res, next) {
    try {
      await execute(req, res);
    } catch (error) {
      next(error);
    }
  };
}

function emitUserChanged(action, user) {
  emitRealtime("user.changed", {
    action,
    id: user?._id || null,
    email: user?.email || null,
    isActive: user?.isActive,
  });
}

const listUsers = withHandler(async (_req, res) => {
  const data = await userService.listUsers();
  res.json({ success: true, data });
});

const createUser = withHandler(async (req, res) => {
  const data = await userService.createUser(req.body);
  emitUserChanged("created", data);
  res.status(201).json({ success: true, data });
});

const updateUserStatus = withHandler(async (req, res) => {
  const data = await userService.updateUserStatus(req.params.id, req.body, req.user._id);
  emitUserChanged("status_updated", data);
  res.json({ success: true, data });
});

module.exports = {
  listUsers,
  createUser,
  updateUserStatus,
};
