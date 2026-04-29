const PmSchedule = require("../models/PmSchedule");
const Asset = require("../models/Asset");
const { getCurrentTriggerValue } = require("./pmEngine.service");
const { httpError } = require("../utils/httpError");
const {
  assertAllowedFields,
  normalizeBoolean,
  normalizeNumber,
  optionalEnum,
  requireEnum,
  requireObjectId,
} = require("../utils/validators");

const triggerTypes = ["hours", "shots", "days", "usage_count"];
const PM_SCHEDULE_ALLOWED_FIELDS = [
  "assetId",
  "triggerType",
  "intervalValue",
  "lastTriggeredValue",
  "isActive",
];

function assertPmScheduleFields(body) {
  assertAllowedFields(body, PM_SCHEDULE_ALLOWED_FIELDS, "Lịch PM");
}

function buildCreatePayload(body) {
  const payload = {
    assetId: requireObjectId(body.assetId, "assetId"),
    triggerType: requireEnum(body.triggerType, triggerTypes, "Loại trigger"),
    intervalValue: normalizeNumber(body.intervalValue, "Chu kỳ PM", {
      min: 1,
      nullable: false,
    }),
    isActive:
      body.isActive === undefined
        ? true
        : normalizeBoolean(body.isActive, "isActive"),
  };

  if (body.lastTriggeredValue !== undefined) {
    payload.lastTriggeredValue = normalizeNumber(
      body.lastTriggeredValue,
      "Giá trị baseline",
      { min: 0 }
    );
  }

  return payload;
}

function buildUpdatePayload(body) {
  const payload = {};

  if (body.assetId !== undefined) {
    payload.assetId = requireObjectId(body.assetId, "assetId");
  }
  if (body.triggerType !== undefined) {
    payload.triggerType = optionalEnum(
      body.triggerType,
      triggerTypes,
      "Loại trigger"
    );
  }
  if (body.intervalValue !== undefined) {
    payload.intervalValue = normalizeNumber(body.intervalValue, "Chu kỳ PM", {
      min: 1,
      nullable: false,
    });
  }
  if (body.lastTriggeredValue !== undefined) {
    payload.lastTriggeredValue = normalizeNumber(
      body.lastTriggeredValue,
      "Giá trị baseline",
      { min: 0 }
    );
  }
  if (body.isActive !== undefined) {
    payload.isActive = normalizeBoolean(body.isActive, "isActive");
  }

  return payload;
}

function buildListFilter(query) {
  const filter = {};

  if (query.assetId) {
    filter.assetId = requireObjectId(query.assetId, "assetId");
  }
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  return filter;
}

async function resolveBaselineValue(assetId, triggerType) {
  const asset = await Asset.findById(assetId).select("assetType").lean();
  if (!asset) return null;

  const baseline = await getCurrentTriggerValue(
    { assetId, triggerType },
    asset.assetType
  );
  return Number.isFinite(Number(baseline)) ? Number(baseline) : 0;
}

async function ensureBaselineValueOrThrow(payload, assetId, triggerType) {
  if (
    payload.lastTriggeredValue !== undefined &&
    payload.lastTriggeredValue !== null
  ) {
    return;
  }

  const baseline = await resolveBaselineValue(assetId, triggerType);
  if (baseline === null) {
    throw httpError(404, "Không tìm thấy tài sản cho lịch PM");
  }
  payload.lastTriggeredValue = baseline;
}

async function findPmScheduleOrThrow(id) {
  const current = await PmSchedule.findById(id).lean();
  if (!current) {
    throw httpError(404, "Không tìm thấy lịch PM");
  }
  return current;
}

async function createPmSchedule(payload) {
  assertPmScheduleFields(payload);
  const parsed = buildCreatePayload(payload);
  await ensureBaselineValueOrThrow(
    parsed,
    parsed.assetId,
    parsed.triggerType
  );
  return PmSchedule.create(parsed);
}

async function listPmSchedules(query) {
  return PmSchedule.find(buildListFilter(query))
    .sort({ _id: -1 })
    .populate("assetId", "assetCode name assetType status")
    .lean();
}

async function getPmScheduleById(id) {
  const data = await PmSchedule.findById(id)
    .populate("assetId")
    .lean();
  if (!data) {
    throw httpError(404, "Không tìm thấy lịch PM");
  }
  return data;
}

async function updatePmSchedule(id, payload) {
  const current = await findPmScheduleOrThrow(id);
  assertPmScheduleFields(payload);
  const parsed = buildUpdatePayload(payload);
  const triggerChanged =
    parsed.triggerType !== undefined || parsed.assetId !== undefined;

  if (triggerChanged && parsed.lastTriggeredValue === undefined) {
    await ensureBaselineValueOrThrow(
      parsed,
      parsed.assetId || current.assetId,
      parsed.triggerType || current.triggerType
    );
  }

  const data = await PmSchedule.findByIdAndUpdate(id, parsed, {
    returnDocument: "after",
    runValidators: true,
  }).lean();

  if (!data) {
    throw httpError(404, "Không tìm thấy lịch PM");
  }
  return data;
}

module.exports = {
  createPmSchedule,
  listPmSchedules,
  getPmScheduleById,
  updatePmSchedule,
};
