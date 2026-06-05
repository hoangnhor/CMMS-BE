const test = require("node:test");
const assert = require("node:assert/strict");

const { getEnv, validateObjectId } = require("../src/config/env");

test("validateObjectId rejects invalid SYSTEM_USER_ID values", () => {
  assert.throws(() => validateObjectId("123", "SYSTEM_USER_ID"), /SYSTEM_USER_ID/);
});

test("validateObjectId accepts valid SYSTEM_USER_ID values", () => {
  assert.equal(
    validateObjectId("507f1f77bcf86cd799439011", "SYSTEM_USER_ID"),
    "507f1f77bcf86cd799439011"
  );
});

test("getEnv rejects production without REDIS_URL", () => {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test";
    process.env.JWT_SECRET = "x".repeat(32);
    process.env.REFRESH_JWT_SECRET = "y".repeat(32);
    process.env.FRONTEND_ORIGIN = "https://app.example.com";
    delete process.env.REDIS_URL;

    assert.throws(() => getEnv(), /REDIS_URL/);
  } finally {
    process.env = originalEnv;
  }
});
