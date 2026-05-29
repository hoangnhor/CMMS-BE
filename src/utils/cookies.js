const ACCESS_TOKEN_COOKIE = "am_at";
const REFRESH_TOKEN_COOKIE = "am_rt";
const CSRF_COOKIE = "am_csrf";
const CSRF_HEADER = "x-csrf-token";

function parseCookieHeader(cookieHeader) {
  const source = String(cookieHeader || "");
  if (!source) return {};

  return source.split(";").reduce((acc, pair) => {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) return acc;
    const key = decodeURIComponent(rawKey.trim());
    const value = decodeURIComponent(rawValue.join("=").trim());
    acc[key] = value;
    return acc;
  }, {});
}

function buildAuthCookieOptions(env) {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
}

module.exports = {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  parseCookieHeader,
  buildAuthCookieOptions,
};
