process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_that_is_long_enough_123456";
process.env.REFRESH_JWT_SECRET =
  process.env.REFRESH_JWT_SECRET || "refresh_secret_that_is_long_enough_123456";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const authController = require("../src/controllers/auth.controller");
const User = require("../src/models/User");

function createRes() {
  return {
    statusCode: 200,
    body: null,
    cookies: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    cookie(name, value) {
      this.cookies.push({ name, value });
      return this;
    },
    clearCookie() {
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("refresh issues new access+refresh cookies from refresh cookie", async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    lean: async () => ({
      _id: "507f1f77bcf86cd799439011",
      name: "Admin",
      email: "admin@test.local",
      role: "admin",
      isActive: true,
      tokenVersion: 1,
    }),
  });

  const refreshToken = jwt.sign(
    { sub: "507f1f77bcf86cd799439011", tv: 1, typ: "refresh" },
    process.env.REFRESH_JWT_SECRET,
    { expiresIn: "30d" }
  );
  const req = { headers: { cookie: `am_rt=${refreshToken}` } };
  const res = createRes();

  await authController.refresh(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body?.success, true);
  assert.equal(res.cookies.length, 2);
  User.findById = originalFindById;
});

test("refresh returns 401 when refresh cookie missing", async () => {
  const req = { headers: {} };
  const res = createRes();

  await authController.refresh(req, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body?.success, false);
});
