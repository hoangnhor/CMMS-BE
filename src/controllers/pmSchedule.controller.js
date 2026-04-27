const PmSchedule = require("../models/PmSchedule");
const Asset = require("../models/Asset");
const { getCurrentTriggerValue } = require("../services/pmEngine.service");
const { emitRealtime } = require("../realtime/io");
const {
  assertAllowedFields,
  normalizeBoolean,
  normalizeNumber,
  optionalEnum,
  requireEnum,
  requireObjectId,
} = require("../utils/validators");

const triggerTypes = ["hours", "shots", "days", "usage_count"];

async function resolveBaselineValue(assetId, triggerType) {
  const asset = await Asset.findById(assetId).select("assetType").lean();
  if (!asset) return null;

  const baseline = await getCurrentTriggerValue(
    { assetId, triggerType },
    asset.assetType
  );
  return Number.isFinite(Number(baseline)) ? Number(baseline) : 0;
}

async function create(req, res, next) {
  try {
    assertAllowedFields(req.body, ["assetId", "triggerType", "intervalValue", "lastTriggeredValue", "isActive"], "Lịch PM");
    const payload = {
      assetId: requireObjectId(req.body.assetId, "assetId"),
      triggerType: requireEnum(req.body.triggerType, triggerTypes, "Loại trigger"),
      intervalValue: normalizeNumber(req.body.intervalValue, "Chu kỳ PM", { min: 1, nullable: false }),
      isActive: req.body.isActive === undefined ? true : normalizeBoolean(req.body.isActive, "isActive"),
    };
    if (req.body.lastTriggeredValue !== undefined) {
      payload.lastTriggeredValue = normalizeNumber(req.body.lastTriggeredValue, "Giá trị baseline", { min: 0 });
    }
    if (
      payload.lastTriggeredValue === undefined ||
      payload.lastTriggeredValue === null
    ) {
      const baseline = await resolveBaselineValue(
        payload.assetId,
        payload.triggerType
      );
      if (baseline === null) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy tài sản cho lịch PM" });
      }
      payload.lastTriggeredValue = baseline;
    }

    const data = await PmSchedule.create(payload);
    emitRealtime("pm_schedule.changed", {
      action: "created",
      id: data?._id || null,
      assetId: data?.assetId || null,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.assetId) filter.assetId = requireObjectId(req.query.assetId, "assetId");
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const data = await PmSchedule.find(filter)
      .sort({ _id: -1 })
      .populate("assetId", "assetCode name assetType status")
      .lean();
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const data = await PmSchedule.findById(req.params.id).populate("assetId").lean();
    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy lịch PM" });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const current = await PmSchedule.findById(req.params.id).lean();
    if (!current) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch PM" });
    }

    assertAllowedFields(req.body, ["assetId", "triggerType", "intervalValue", "lastTriggeredValue", "isActive"], "Lịch PM");
    const payload = {};
    if (req.body.assetId !== undefined) payload.assetId = requireObjectId(req.body.assetId, "assetId");
    if (req.body.triggerType !== undefined) payload.triggerType = optionalEnum(req.body.triggerType, triggerTypes, "Loại trigger");
    if (req.body.intervalValue !== undefined) payload.intervalValue = normalizeNumber(req.body.intervalValue, "Chu kỳ PM", { min: 1, nullable: false });
    if (req.body.lastTriggeredValue !== undefined) payload.lastTriggeredValue = normalizeNumber(req.body.lastTriggeredValue, "Giá trị baseline", { min: 0 });
    if (req.body.isActive !== undefined) payload.isActive = normalizeBoolean(req.body.isActive, "isActive");
    const triggerChanged =
      payload.triggerType !== undefined || payload.assetId !== undefined;

    if (triggerChanged && payload.lastTriggeredValue === undefined) {
      const baseline = await resolveBaselineValue(
        payload.assetId || current.assetId,
        payload.triggerType || current.triggerType
      );
      if (baseline === null) {
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy tài sản cho lịch PM" });
      }
      payload.lastTriggeredValue = baseline;
    }

    const data = await PmSchedule.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy lịch PM" });
    emitRealtime("pm_schedule.changed", {
      action: "updated",
      id: req.params.id,
      assetId: data?.assetId || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  getById,
  update,
};
