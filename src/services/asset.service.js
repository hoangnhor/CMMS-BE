const Asset = require("../models/Asset");
const MachineDetail = require("../models/MachineDetail");
const MoldDetail = require("../models/MoldDetail");
const JigDetail = require("../models/JigDetail");
const InfraDetail = require("../models/InfraDetail");
const PmSchedule = require("../models/PmSchedule");
const WorkOrder = require("../models/WorkOrder");
const MaintenanceLog = require("../models/MaintenanceLog");
const SparePartUsed = require("../models/SparePartUsed");
const { httpError } = require("../utils/httpError");
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

function dropUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined));
}

function getDetailModel(assetType) {
  if (assetType === "machine") return MachineDetail;
  if (assetType === "mold") return MoldDetail;
  if (assetType === "jig_tool") return JigDetail;
  if (assetType === "infrastructure") return InfraDetail;
  throw httpError(400, "assetType không được hỗ trợ");
}

function canViewCost(role) {
  return ["admin", "site_manager", "accountant"].includes(role);
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

async function hardDeleteAssetById(assetDoc) {
  const workOrders = await WorkOrder.find({ assetId: assetDoc._id }).select("_id").lean();
  const workOrderIds = workOrders.map((item) => item._id);
  const DetailModel = getDetailModel(assetDoc.assetType);

  await Promise.all([
    DetailModel.deleteOne({ assetId: assetDoc._id }),
    PmSchedule.deleteMany({ assetId: assetDoc._id }),
    MaintenanceLog.deleteMany({
      $or: [{ assetId: assetDoc._id }, { workOrderId: { $in: workOrderIds } }],
    }),
    SparePartUsed.deleteMany({ workOrderId: { $in: workOrderIds } }),
    WorkOrder.deleteMany({ assetId: assetDoc._id }),
  ]);

  await Asset.deleteOne({ _id: assetDoc._id });
}

async function createAsset(payload) {
  const { assetData, detail } = normalizeAssetPayload(payload, { create: true });
  const existed = await Asset.findOne({ assetCode: assetData.assetCode }).lean();
  if (existed) {
    if (existed.status === "disposed") {
      await hardDeleteAssetById(existed);
    } else {
      throw httpError(409, "Mã tài sản đã tồn tại");
    }
  }
  const asset = await Asset.create(assetData);
  const DetailModel = getDetailModel(asset.assetType);
  const detailDoc = await DetailModel.create({ assetId: asset._id, ...(detail || {}) });
  return { asset, detail: detailDoc };
}

async function listAssets(query = {}, actor = null) {
  const { assetType, status, keyword } = query;
  const filter = {};
  if (assetType) filter.assetType = requireEnum(assetType, assetTypes, "Loại tài sản");
  if (status) filter.status = requireEnum(status, assetStatuses, "Trạng thái tài sản");
  if (keyword) {
    filter.$or = [
      { assetCode: { $regex: keyword, $options: "i" } },
      { name: { $regex: keyword, $options: "i" } },
      { location: { $regex: keyword, $options: "i" } },
    ];
  }
  const rows = await Asset.find(filter).sort({ _id: -1 }).lean();
  if (!canViewCost(actor?.role)) {
    rows.forEach((item) => {
      item.purchasePrice = undefined;
    });
  }
  return rows;
}

async function getAssetById(id, actor = null) {
  const asset = await Asset.findById(id).lean();
  if (!asset) throw httpError(404, "Không tìm thấy tài sản");
  const DetailModel = getDetailModel(asset.assetType);
  const detail = await DetailModel.findOne({ assetId: asset._id }).lean();
  if (!canViewCost(actor?.role)) {
    asset.purchasePrice = undefined;
  }
  return { asset, detail };
}

async function updateAsset(id, payload) {
  const current = await Asset.findById(id);
  if (!current) throw httpError(404, "Không tìm thấy tài sản");

  const { assetData, detail } = normalizeAssetPayload(payload, {
    create: false,
    currentType: current.assetType,
  });
  Object.assign(current, assetData);
  const savedAsset = await current.save();

  const DetailModel = getDetailModel(savedAsset.assetType);
  const detailDoc = await DetailModel.findOneAndUpdate(
    { assetId: savedAsset._id },
    { $set: detail || {} },
    { returnDocument: "after", upsert: true }
  ).lean();

  return { asset: savedAsset.toObject(), detail: detailDoc };
}

async function deleteAsset(id) {
  const current = await Asset.findById(id).lean();
  if (!current) throw httpError(404, "Không tìm thấy tài sản");
  await hardDeleteAssetById(current);
  return { id };
}

module.exports = {
  createAsset,
  listAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
};
