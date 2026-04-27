const crypto = require("crypto");

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

function createRateLimiter({ windowMs, max, name }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${name}:${ip}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
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
