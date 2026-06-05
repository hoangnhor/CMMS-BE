const test = require("node:test");
const assert = require("node:assert/strict");
const { createRateLimiter } = require("../src/middleware/security");

function makeReqRes(id = "req-rate") {
  const req = {
    id,
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    method: "GET",
  };
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
}

test("rate limiter blocks requests exceeding max in memory fallback", async () => {
  const limiter = createRateLimiter({
    windowMs: 5000,
    max: 2,
    name: "test",
    redisUrl: null,
  });
  const { req, res } = makeReqRes();

  await limiter(req, res, () => {});
  await limiter(req, res, () => {});
  await limiter(req, res, () => {});

  assert.equal(res.statusCode, 429);
  assert.equal(res.body.success, false);
  assert.ok(Number(res.headers["Retry-After"]) >= 1);
});

test("rate limiter fails closed in production when redis is unavailable", async () => {
  const limiter = createRateLimiter({
    windowMs: 5000,
    max: 2,
    name: "test",
    redisUrl: null,
    nodeEnv: "production",
  });
  const { req, res } = makeReqRes("req-rate-prod");

  await limiter(req, res, () => {});

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Rate limit tạm thời không khả dụng/);
  assert.equal(res.body.requestId, "req-rate-prod");
});
