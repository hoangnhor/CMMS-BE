const dotenv = require("dotenv");

dotenv.config({ override: true });

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
    .map((item) => item.trim().replace(/\/+$/, ""))
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

function parseBoolean(value, fallback, label) {
  const raw = sanitizeEnvValue(value).toLowerCase();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${label} phải là true hoặc false`);
}

function parseAutoBoolean(value, fallback = false) {
  const raw = sanitizeEnvValue(value).toLowerCase();
  if (!raw) return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}

function getEnv() {
  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${missing.join(", ")}`);
  }

  const mongoUri = normalizeMongoUri(process.env.MONGO_URI);
  const jwtSecret = sanitizeEnvValue(process.env.JWT_SECRET);
  const jwtExpiresIn = sanitizeEnvValue(process.env.JWT_EXPIRES_IN || "7d");
  const refreshJwtSecret = sanitizeEnvValue(
    process.env.REFRESH_JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : jwtSecret)
  );
  const refreshJwtExpiresIn = sanitizeEnvValue(process.env.REFRESH_JWT_EXPIRES_IN || "30d");
  const frontendOrigin = parseOrigins(process.env.FRONTEND_ORIGIN || "*");
  if (!jwtExpiresIn) {
    throw new Error("JWT_EXPIRES_IN không hợp lệ");
  }
  if (!refreshJwtSecret) {
    throw new Error("REFRESH_JWT_SECRET là bắt buộc");
  }
  if (!refreshJwtExpiresIn) {
    throw new Error("REFRESH_JWT_EXPIRES_IN không hợp lệ");
  }

  if (process.env.NODE_ENV === "production") {
    if (frontendOrigin === "*") {
      throw new Error("FRONTEND_ORIGIN không được là * trong production");
    }
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET trong production phải có ít nhất 32 ký tự");
    }
    if (refreshJwtSecret.length < 32) {
      throw new Error("REFRESH_JWT_SECRET trong production phải có ít nhất 32 ký tự");
    }
    if (parseAutoBoolean(process.env.SYNC_INDEXES_ON_BOOT, false)) {
      throw new Error("Không cho phép SYNC_INDEXES_ON_BOOT=true trong production runtime");
    }
    if (parseAutoBoolean(process.env.AUTO_FIX_PM_WO_DUPLICATES, false)) {
      throw new Error("Không cho phép AUTO_FIX_PM_WO_DUPLICATES=true trong production runtime");
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
  const redisUrl = sanitizeEnvValue(process.env.REDIS_URL || "");
  const redisPrefix = sanitizeEnvValue(process.env.REDIS_PREFIX || "am:rl");
  const shouldSyncIndexesOnBoot = parseAutoBoolean(
    process.env.SYNC_INDEXES_ON_BOOT,
    false
  );
  const autoFixPmWoDuplicates = parseAutoBoolean(
    process.env.AUTO_FIX_PM_WO_DUPLICATES,
    false
  );

  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port,
    mongoUri,
    jwtSecret,
    jwtExpiresIn,
    refreshJwtSecret,
    refreshJwtExpiresIn,
    frontendOrigin,
    pmCron: process.env.PM_CHECK_CRON || "0 6 * * *",
    systemUserId: process.env.SYSTEM_USER_ID || null,
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false, "TRUST_PROXY"),
    jsonLimit: process.env.JSON_LIMIT || "1mb",
    globalRateLimitWindowMs,
    globalRateLimitMax,
    authRateLimitWindowMs,
    authRateLimitMax,
    shutdownTimeoutMs,
    redisUrl: redisUrl || null,
    redisPrefix,
    shouldSyncIndexesOnBoot,
    autoFixPmWoDuplicates,
  };
}

module.exports = { getEnv };
