const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { getEnv } = require("../config/env");
const { assertAllowedFields, requireEmail, requireString } = require("../utils/validators");
const {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildAuthCookieOptions,
  parseCookieHeader,
} = require("../utils/cookies");

const env = getEnv();

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, tv: Number(user.tokenVersion || 0) },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: String(user._id), tv: Number(user.tokenVersion || 0), typ: "refresh" },
    env.refreshJwtSecret,
    { expiresIn: env.refreshJwtExpiresIn }
  );
}

function setAuthCookies(res, accessToken, refreshToken) {
  const cookieOptions = buildAuthCookieOptions(env);
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions);
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);
}

function clearAuthCookies(res) {
  const cookieOptions = buildAuthCookieOptions(env);
  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions);
}

function buildAuthResponse(user, csrfToken) {
  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    csrfToken,
  };
}

async function verifyRefreshUserOrThrow(req) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const refreshToken = cookies[REFRESH_TOKEN_COOKIE] || null;
  if (!refreshToken) return null;

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.refreshJwtSecret);
  } catch {
    return null;
  }

  if (decoded?.typ !== "refresh" || !decoded?.sub) return null;

  const user = await User.findById(decoded.sub).lean();
  if (!user || !user.isActive) return null;
  if (Number(decoded.tv || 0) !== Number(user.tokenVersion || 0)) return null;
  return user;
}

async function login(req, res, next) {
  try {
    assertAllowedFields(req.body, ["email", "password"], "Thông tin đăng nhập");
    const email = requireEmail(req.body.email);
    const password = requireString(req.body.password, "Mật khẩu", { max: 128 });
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Sai thông tin đăng nhập" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Sai thông tin đăng nhập" });
    }

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    setAuthCookies(res, token, refreshToken);

    return res.json({
      success: true,
      data: buildAuthResponse(user, res.locals.csrfToken || null),
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res) {
  const { _id, name, email, role, isActive } = req.user;
  return res.json({
    success: true,
    data: {
      user: { _id, name, email, role, isActive },
      csrfToken: res.locals.csrfToken || null,
    },
  });
}

async function refresh(req, res) {
  const user = await verifyRefreshUserOrThrow(req);
  if (!user) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn" });
  }

  const token = signToken(user);
  const refreshToken = signRefreshToken(user);
  setAuthCookies(res, token, refreshToken);
  return res.json({
    success: true,
    data: buildAuthResponse(user, res.locals.csrfToken || null),
  });
}

async function logout(req, res) {
  clearAuthCookies(res);
  return res.json({ success: true, message: "Đã đăng xuất" });
}

async function logoutAll(req, res, next) {
  try {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
    clearAuthCookies(res);
    return res.json({ success: true, message: "Đã đăng xuất toàn bộ phiên" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  me,
  refresh,
  logout,
  logoutAll,
};
