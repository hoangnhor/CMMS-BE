const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getEnv } = require("../config/env");
const { ACCESS_TOKEN_COOKIE, parseCookieHeader } = require("../utils/cookies");

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
    const bearerToken = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
    const cookieToken = parseCookieHeader(req.headers.cookie || "")[ACCESS_TOKEN_COOKIE] || null;
    const token = bearerToken || cookieToken;

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
    if (Number(decoded.tv || 0) !== Number(user.tokenVersion || 0)) {
      return unauthorized("Phiên đăng nhập đã hết hiệu lực");
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = auth;
