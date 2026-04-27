const mongoose = require("mongoose");
const { httpError } = require("./httpError");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertPlainObject(value, label = "Dữ liệu") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError(400, `${label} không hợp lệ`);
  }
}

function assertAllowedFields(payload, allowedFields, label = "Dữ liệu") {
  assertPlainObject(payload, label);
  const allowed = new Set(allowedFields);
  const unknown = Object.keys(payload).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw httpError(400, `${label} chứa trường không được hỗ trợ: ${unknown.join(", ")}`);
  }
}

function pickAllowed(payload, allowedFields) {
  return allowedFields.reduce((result, field) => {
    if (payload[field] !== undefined) result[field] = payload[field];
    return result;
  }, {});
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function requireObjectId(value, label) {
  if (!isValidObjectId(value)) {
    throw httpError(400, `${label} không hợp lệ`);
  }
  return value;
}

function optionalObjectId(value, label) {
  if (value === undefined || value === null || value === "") return null;
  return requireObjectId(value, label);
}

function requireString(value, label, { max = 255 } = {}) {
  const text = String(value || "").trim();
  if (!text) throw httpError(400, `${label} là bắt buộc`);
  if (text.length > max) throw httpError(400, `${label} vượt quá ${max} ký tự`);
  return text;
}

function optionalString(value, label, { max = 255 } = {}) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (text.length > max) throw httpError(400, `${label} vượt quá ${max} ký tự`);
  return text;
}

function requireEmail(value) {
  const email = requireString(value, "Email", { max: 320 }).toLowerCase();
  if (!emailPattern.test(email)) throw httpError(400, "Email không hợp lệ");
  return email;
}

function requirePassword(value, { min = 8 } = {}) {
  const password = String(value || "");
  if (password.length < min) throw httpError(400, `Mật khẩu phải có ít nhất ${min} ký tự`);
  if (password.length > 128) throw httpError(400, "Mật khẩu vượt quá 128 ký tự");
  return password;
}

function requireEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    throw httpError(400, `${label} không hợp lệ`);
  }
  return value;
}

function optionalEnum(value, allowed, label) {
  if (value === undefined || value === null || value === "") return undefined;
  return requireEnum(value, allowed, label);
}

function normalizeNumber(value, label, { min = null, max = null, nullable = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (nullable) return null;
    throw httpError(400, `${label} là bắt buộc`);
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) throw httpError(400, `${label} phải là số hợp lệ`);
  if (min !== null && numberValue < min) throw httpError(400, `${label} phải lớn hơn hoặc bằng ${min}`);
  if (max !== null && numberValue > max) throw httpError(400, `${label} phải nhỏ hơn hoặc bằng ${max}`);
  return numberValue;
}

function normalizeDate(value, label, { nullable = true } = {}) {
  if (value === undefined || value === null || value === "") {
    if (nullable) return null;
    throw httpError(400, `${label} là bắt buộc`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError(400, `${label} không hợp lệ`);
  return date;
}

function normalizeBoolean(value, label) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw httpError(400, `${label} phải là true hoặc false`);
}

module.exports = {
  assertAllowedFields,
  assertPlainObject,
  isValidObjectId,
  normalizeBoolean,
  normalizeDate,
  normalizeNumber,
  optionalEnum,
  optionalObjectId,
  optionalString,
  pickAllowed,
  requireEmail,
  requireEnum,
  requireObjectId,
  requirePassword,
  requireString,
};
