process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_that_is_long_enough_123456";
process.env.REFRESH_JWT_SECRET =
  process.env.REFRESH_JWT_SECRET || "refresh_secret_that_is_long_enough_123456";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const auth = require("../src/middleware/auth");
const User = require("../src/models/User");

function makeReqRes(token) {
  const req = {
    id: "req-1",
    headers: {
      authorization: token ? `Bearer ${token}` : "",
    },
  };
  const res = {
    statusCode: 200,
    body: null,
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

test("auth middleware accepts token with matching tokenVersion", async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439011",
        role: "admin",
        isActive: true,
        tokenVersion: 2,
      }),
    }),
  });

  const token = jwt.sign(
    { sub: "507f1f77bcf86cd799439011", role: "admin", tv: 2 },
    process.env.JWT_SECRET
  );
  const { req, res } = makeReqRes(token);
  let nextCalled = false;

  await auth(req, res, (error) => {
    if (error) throw error;
    nextCalled = true;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(req.user.role, "admin");
  assert.equal(nextCalled, true);
  User.findById = originalFindById;
});

test("auth middleware rejects token when tokenVersion mismatches", async () => {
  const originalFindById = User.findById;
  User.findById = () => ({
    select: () => ({
      lean: async () => ({
        _id: "507f1f77bcf86cd799439011",
        role: "admin",
        isActive: true,
        tokenVersion: 3,
      }),
    }),
  });

  const token = jwt.sign(
    { sub: "507f1f77bcf86cd799439011", role: "admin", tv: 2 },
    process.env.JWT_SECRET
  );
  const { req, res } = makeReqRes(token);
  let nextCalled = false;
  await auth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /hết hiệu lực/);
  assert.equal(nextCalled, false);
  User.findById = originalFindById;
});
