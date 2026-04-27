const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBoolean,
  normalizeNumber,
  requireEmail,
  requireObjectId,
  requirePassword,
} = require("../src/utils/validators");

test("requireEmail normalizes valid email", () => {
  assert.equal(requireEmail(" Admin@Factory.Local "), "admin@factory.local");
});

test("requireEmail rejects invalid email", () => {
  assert.throws(() => requireEmail("bad-email"), /Email không hợp lệ/);
});

test("requirePassword enforces minimum length", () => {
  assert.throws(() => requirePassword("short"), /ít nhất 8/);
});

test("normalizeNumber validates numeric range", () => {
  assert.equal(normalizeNumber("12.5", "Giờ công", { min: 0 }), 12.5);
  assert.throws(() => normalizeNumber("-1", "Giờ công", { min: 0 }), /lớn hơn hoặc bằng 0/);
});

test("normalizeBoolean accepts boolean strings only", () => {
  assert.equal(normalizeBoolean("true", "isActive"), true);
  assert.equal(normalizeBoolean(false, "isActive"), false);
  assert.throws(() => normalizeBoolean("yes", "isActive"), /true hoặc false/);
});

test("requireObjectId validates Mongo ObjectId", () => {
  const id = "507f1f77bcf86cd799439011";
  assert.equal(requireObjectId(id, "id"), id);
  assert.throws(() => requireObjectId("123", "id"), /id không hợp lệ/);
});
