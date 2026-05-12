const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getEnv } = require("../config/env");

const env = getEnv();

async function auth(req, res, next) {
  const unauthorized = (message) =>
    res.status(401).json({
      success: false,
      message,
      requestId: req.id,
    });

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;

    if (!token) {
      return unauthorized("Thiếu token");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        return unauthorized("Chưa xác thực");
      }
      return next(error);
    }

    const user = await User.findById(decoded.sub).select("-passwordHash").lean();

    if (!user || !user.isActive) {
      return unauthorized("Token không hợp lệ hoặc tài khoản đã bị khóa");
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = auth;
