const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getEnv } = require("../config/env");

const env = getEnv();

async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Thiếu token" });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.sub).select("-passwordHash").lean();

    if (!user || !user.isActive) {
      return res
        .status(401)
        .json({ success: false, message: "Token không hợp lệ hoặc tài khoản đã bị khóa" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Chưa xác thực" });
  }
}

module.exports = auth;
