const pmScheduleService = require("../services/pmSchedule.service");
const { emitRealtime } = require("../realtime/io");

function emitPmScheduleChanged(action, schedule) {
  emitRealtime("pm_schedule.changed", {
    action,
    id: schedule?._id || null,
    assetId: schedule?.assetId || null,
  });
}

function withHandler(execute) {
  return async function handler(req, res, next) {
    try {
      await execute(req, res);
    } catch (error) {
      next(error);
    }
  };
}

const create = withHandler(async (req, res) => {
  const data = await pmScheduleService.createPmSchedule(req.body);
  emitPmScheduleChanged("created", data);
  res.status(201).json({ success: true, data });
});

const list = withHandler(async (req, res) => {
  const data = await pmScheduleService.listPmSchedules(req.query);
  res.json({ success: true, data });
});

const getById = withHandler(async (req, res) => {
  const data = await pmScheduleService.getPmScheduleById(req.params.id);
  res.json({ success: true, data });
});

const update = withHandler(async (req, res) => {
  const data = await pmScheduleService.updatePmSchedule(req.params.id, req.body);
  emitPmScheduleChanged("updated", data);
  res.json({ success: true, data });
});

module.exports = {
  create,
  list,
  getById,
  update,
};
