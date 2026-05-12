const dotenv = require("dotenv");

dotenv.config();

const requiredVars = ["MONGO_URI", "JWT_SECRET"];

function sanitizeEnvValue(value) {
  if (value == null) return "";
  const trimmed = String(value).trim().replace(/^\uFEFF/, "");
  return trimmed.replace(/^['"]|['"]$/g, "");
}

function normalizeMongoUri(value) {
  let uri = sanitizeEnvValue(value);
  if (uri.toUpperCase().startsWith("MONGO_URI=")) {
    uri = sanitizeEnvValue(uri.slice("MONGO_URI=".length));
  }
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    throw new Error(
      "MONGO_URI không hợp lệ. Phải bắt đầu bằng mongodb:// hoặc mongodb+srv://"
    );
  }
  return uri;
}

function parseOrigins(value) {
  const normalized = sanitizeEnvValue(value);
  if (!normalized || normalized === "*") return "*";
  const origins = normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : "*";
}

function parsePositiveInt(value, fallback, label) {
  const raw = sanitizeEnvValue(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} phải là số nguyên dương`);
  }
  return parsed;
}

function getEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`);
  }

  const mongoUri = normalizeMongoUri(process.env.MONGO_URI);
  const jwtSecret = sanitizeEnvValue(process.env.JWT_SECRET);
  const frontendOrigin = parseOrigins(process.env.FRONTEND_ORIGIN || "*");

  if (process.env.NODE_ENV === "production") {
    if (frontendOrigin === "*") {
      throw new Error("FRONTEND_ORIGIN không được là * trong production");
    }
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET trong production phải có ít nhất 32 ký tự");
    }
  }

  const port = parsePositiveInt(process.env.PORT, 5000, "PORT");
  const globalRateLimitWindowMs = parsePositiveInt(
    process.env.RATE_LIMIT_WINDOW_MS,
    60000,
    "RATE_LIMIT_WINDOW_MS"
  );
  const globalRateLimitMax = parsePositiveInt(
    process.env.RATE_LIMIT_MAX,
    600,
    "RATE_LIMIT_MAX"
  );
  const authRateLimitWindowMs = parsePositiveInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    60000,
    "AUTH_RATE_LIMIT_WINDOW_MS"
  );
  const authRateLimitMax = parsePositiveInt(
    process.env.AUTH_RATE_LIMIT_MAX,
    20,
    "AUTH_RATE_LIMIT_MAX"
  );
  const shutdownTimeoutMs = parsePositiveInt(
    process.env.SHUTDOWN_TIMEOUT_MS,
    10000,
    "SHUTDOWN_TIMEOUT_MS"
  );

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port,
    mongoUri,
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    frontendOrigin,
    pmCron: process.env.PM_CHECK_CRON || "0 6 * * *",
    systemUserId: process.env.SYSTEM_USER_ID || null,
    trustProxy: process.env.TRUST_PROXY === "true",
    jsonLimit: process.env.JSON_LIMIT || "1mb",
    globalRateLimitWindowMs,
    globalRateLimitMax,
    authRateLimitWindowMs,
    authRateLimitMax,
    shutdownTimeoutMs,
  };
}

module.exports = { getEnv };
