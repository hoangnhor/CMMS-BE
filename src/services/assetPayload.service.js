const {
  assertAllowedFields,
  assertPlainObject,
  normalizeDate,
  normalizeNumber,
  optionalEnum,
  optionalObjectId,
  optionalString,
  pickAllowed,
  requireEnum,
  requireString,
} = require("../utils/validators");

const assetTypes = ["machine", "mold", "jig_tool", "infrastructure"];
const assetStatuses = ["active", "in_repair", "idle", "disposed"];
const assetFields = [
  "assetCode",
  "name",
  "assetType",
  "status",
  "purchaseDate",
  "purchasePrice",
  "location",
  "manufacturer",
  "model",
  "serialNumber",
];
const detailFieldsByType = {
  machine: ["spindleHours", "cycleCount", "oee_availability", "oee_performance", "oee_quality", "alarmCode", "pmIntervalHours", "pmIntervalDays"],
  mold: ["totalShots", "shotLimit", "currentMachineId", "storageLocation", "lastMaintenanceShot"],
  jig_tool: ["usageCount", "sharpenCount", "sharpenLimit", "calibrationDate", "nextCalibrationDate", "checkedOutBy", "checkedOutMachineId"],
  infrastructure: ["operatingHours", "pmIntervalDays", "lastInspectionDate", "nextInspectionDate"],
};
const stringDetailFields = ["alarmCode", "storageLocation"];
const MAX_KEYWORD_LENGTH = 80;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dropUndefined(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  );
}

function normalizeDetailPayload(detail, assetType) {
  if (detail === undefined || detail === null) return {};
  assertPlainObject(detail, "Thông tin chi tiết tài sản");
  const allowedFields = detailFieldsByType[assetType] || [];
  assertAllowedFields(detail, allowedFields, "Thông tin chi tiết tài sản");

  const normalized = {};
  allowedFields.forEach((field) => {
    const value = detail[field];
    if (value === undefined) return;
    if (field.endsWith("Id") || field === "checkedOutBy") {
      normalized[field] = optionalObjectId(value, field);
    } else if (field.toLowerCase().includes("date")) {
      normalized[field] = normalizeDate(value, field);
    } else if (stringDetailFields.includes(field)) {
      normalized[field] = optionalString(value, field, { max: 180 });
    } else {
      normalized[field] = normalizeNumber(value, field, { min: 0 });
    }
  });

  return normalized;
}

function normalizeAssetPayload(payload, { create = false, currentType = null } = {}) {
  assertPlainObject(payload, "Tài sản");
  assertAllowedFields(payload, [...assetFields, "detail"], "Tài sản");

  const raw = pickAllowed(payload, assetFields);
  const normalized = {};

  if (create) {
    normalized.assetCode = requireString(raw.assetCode, "Mã tài sản", { max: 80 });
    normalized.name = requireString(raw.name, "Tên tài sản", { max: 180 });
    normalized.assetType = requireEnum(raw.assetType, assetTypes, "Loại tài sản");
  } else {
    normalized.assetCode = raw.assetCode !== undefined ? requireString(raw.assetCode, "Mã tài sản", { max: 80 }) : undefined;
    normalized.name = raw.name !== undefined ? requireString(raw.name, "Tên tài sản", { max: 180 }) : undefined;
    normalized.assetType = undefined;
  }

  normalized.status = optionalEnum(raw.status, assetStatuses, "Trạng thái tài sản");
  normalized.purchaseDate = raw.purchaseDate !== undefined ? normalizeDate(raw.purchaseDate, "Ngày mua") : undefined;
  normalized.purchasePrice = raw.purchasePrice !== undefined ? normalizeNumber(raw.purchasePrice, "Giá trị tài sản", { min: 0 }) : undefined;
  normalized.location = optionalString(raw.location, "Vị trí", { max: 180 });
  normalized.manufacturer = optionalString(raw.manufacturer, "Hãng sản xuất", { max: 120 });
  normalized.model = optionalString(raw.model, "Model", { max: 120 });
  normalized.serialNumber = optionalString(raw.serialNumber, "Serial", { max: 120 });

  const assetType = normalized.assetType || currentType;
  return {
    assetData: dropUndefined(normalized),
    detail: normalizeDetailPayload(payload.detail, assetType),
  };
}

function buildAssetFilter(query = {}) {
  const { assetType, status, keyword } = query;
  const filter = {};
  if (assetType) filter.assetType = requireEnum(assetType, assetTypes, "Loại tài sản");
  if (status) filter.status = requireEnum(status, assetStatuses, "Trạng thái tài sản");
  if (keyword) {
    const safeKeyword = escapeRegex(String(keyword).trim().slice(0, MAX_KEYWORD_LENGTH));
    if (!safeKeyword) return filter;
    filter.$or = [
      { assetCode: { $regex: safeKeyword, $options: "i" } },
      { name: { $regex: safeKeyword, $options: "i" } },
      { location: { $regex: safeKeyword, $options: "i" } },
    ];
  }
  return filter;
}

function canViewCost(role) {
  return ["admin", "site_manager", "accountant"].includes(role);
}

function stripAssetCost(asset, actor) {
  if (!asset || canViewCost(actor?.role)) return asset;
  asset.purchasePrice = undefined;
  return asset;
}

module.exports = {
  normalizeAssetPayload,
  buildAssetFilter,
  stripAssetCost,
};
