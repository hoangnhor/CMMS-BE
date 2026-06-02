const crypto = require("crypto");
const {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  parseCookieHeader,
} = require("../utils/cookies");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_IGNORED_PATHS = new Set(["/api/auth/login"]);

function buildCsrfCookieOptions(env) {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}

function issueCsrfCookie(env, req, res, next) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const csrfToken = cookies[CSRF_COOKIE] || crypto.randomBytes(24).toString("base64url");
  if (!cookies[CSRF_COOKIE]) {
    res.cookie(CSRF_COOKIE, csrfToken, buildCsrfCookieOptions(env));
  }
  res.locals.csrfToken = csrfToken;
  next();
}

function requireCsrfToken(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_IGNORED_PATHS.has(req.path)) return next();

  const cookies = parseCookieHeader(req.headers.cookie || "");
  const hasAuthCookie = Boolean(cookies[ACCESS_TOKEN_COOKIE] || cookies[REFRESH_TOKEN_COOKIE]);
  if (!hasAuthCookie) return next();

  const csrfCookie = cookies[CSRF_COOKIE] || "";
  const csrfHeader = String(req.headers[CSRF_HEADER] || "").trim();

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      success: false,
      message: "CSRF token không hợp lệ",
      requestId: req.id,
    });
  }

  return next();
}

module.exports = {
  issueCsrfCookie,
  requireCsrfToken,
};
