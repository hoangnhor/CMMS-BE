const crypto = require("crypto");
const { createClient } = require("redis");

function requestId(req, res, next) {
  const incomingId = req.headers["x-request-id"];
  req.id = typeof incomingId === "string" && incomingId.trim()
    ? incomingId.trim().slice(0, 80)
    : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}

function securityHeaders(env) {
  return (_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (env.nodeEnv === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    }
    next();
  };
}

function findUnsafeKey(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 12) return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const unsafe = findUnsafeKey(item, depth + 1);
      if (unsafe) return unsafe;
    }
    return "";
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) return key;
    const unsafe = findUnsafeKey(value[key], depth + 1);
    if (unsafe) return unsafe;
  }
  return "";
}

function blockUnsafePayload(req, res, next) {
  const unsafeKey = findUnsafeKey(req.body) || findUnsafeKey(req.query);
  if (unsafeKey) {
    return res.status(400).json({
      success: false,
      message: `Trường dữ liệu không hợp lệ: ${unsafeKey}`,
      requestId: req.id,
    });
  }
  return next();
}

let redisClient = null;
let redisInit = null;
let redisWarned = false;

async function getRedisClient(redisUrl) {
  if (!redisUrl) return null;
  if (redisClient?.isReady) return redisClient;
  if (redisInit) return redisInit;

  redisClient = createClient({ url: redisUrl });
  redisClient.on("error", (error) => {
    if (!redisWarned) {
      redisWarned = true;
      console.warn("[rate-limit] Redis unavailable, fallback memory:", error?.message || error);
    }
  });

  redisInit = redisClient
    .connect()
    .then(() => redisClient)
    .catch(() => null)
    .finally(() => {
      redisInit = null;
    });

  return redisInit;
}

function createRateLimiter({ windowMs, max, name, redisUrl = null, redisPrefix = "am:rl" }) {
  const safeWindowMs = Number.isInteger(windowMs) && windowMs > 0 ? windowMs : 60000;
  const safeMax = Number.isInteger(max) && max > 0 ? max : 100;
  const safeName = name || "global";
  const buckets = new Map();
  let lastSweepAt = 0;

  return async (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${safeName}:${ip}`;
    const now = Date.now();

    const client = await getRedisClient(redisUrl);
    if (client?.isReady) {
      try {
        const redisKey = `${redisPrefix}:${key}`;
        const count = await client.incr(redisKey);
        if (count === 1) {
          await client.pexpire(redisKey, safeWindowMs);
        }
        if (count > safeMax) {
          const ttlMs = await client.pttl(redisKey);
          const retryAfter = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : safeWindowMs) / 1000));
          res.setHeader("Retry-After", String(retryAfter));
          return res.status(429).json({
            success: false,
            message: "Quá nhiều yêu cầu, vui lòng thử lại sau",
            requestId: req.id,
          });
        }
        return next();
      } catch (error) {
        if (!redisWarned) {
          redisWarned = true;
          console.warn("[rate-limit] Redis runtime error, fallback memory:", error?.message || error);
        }
      }
    }

    if (now - lastSweepAt >= safeWindowMs) {
      for (const [bucketKey, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }
      lastSweepAt = now;
    }

    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + safeWindowMs });
      return next();
    }

    current.count += 1;
    if (current.count > safeMax) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        success: false,
        message: "Quá nhiều yêu cầu, vui lòng thử lại sau",
        requestId: req.id,
      });
    }

    return next();
  };
}

function requireJsonContent(req, res, next) {
  if (["POST", "PUT", "PATCH"].includes(req.method) && !req.is("application/json")) {
    return res.status(415).json({
      success: false,
      message: "Content-Type phải là application/json",
      requestId: req.id,
    });
  }
  return next();
}

module.exports = {
  blockUnsafePayload,
  createRateLimiter,
  requestId,
  requireJsonContent,
  securityHeaders,
};
