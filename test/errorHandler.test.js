const test = require("node:test");
const assert = require("node:assert/strict");
const errorHandler = require("../src/middleware/errorHandler");

test("errorHandler maps CORS blocked error to HTTP 403", () => {
  const req = {
    id: "req-cors",
    method: "OPTIONS",
    originalUrl: "/api/auth/login",
    app: { get: () => "development" },
  };
  const res = {
    headersSent: false,
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  errorHandler(new Error("CORS blocked"), req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
  assert.match(res.payload.message, /Origin không được phép/);
});
