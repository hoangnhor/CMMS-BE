const workOrderService = require("../services/workOrder.service");
const { emitRealtime } = require("../realtime/io");

function emitWorkOrderChanged(action, id, data) {
  emitRealtime("work_order.changed", {
    action,
    id,
    status: data?.status || null,
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
  const data = await workOrderService.createWorkOrder(req.body, req.user);
  emitWorkOrderChanged("created", data?._id || data?.workOrder?._id || null, data);
  res.status(201).json({ success: true, data });
});

const list = withHandler(async (req, res) => {
  const data = await workOrderService.listWorkOrders(req.query, req.user);
  res.json({ success: true, data });
});

const getById = withHandler(async (req, res) => {
  const data = await workOrderService.getWorkOrderById(req.params.id, req.user);
  res.json({ success: true, data });
});

const update = withHandler(async (req, res) => {
  const data = await workOrderService.updateWorkOrder(req.params.id, req.body, req.user);
  emitWorkOrderChanged("updated", req.params.id, data);
  res.json({ success: true, data });
});

const submit = withHandler(async (req, res) => {
  const data = await workOrderService.submitForApproval(req.params.id, req.user);
  emitWorkOrderChanged("submitted", req.params.id, data);
  res.json({ success: true, data });
});

const approve = withHandler(async (req, res) => {
  const data = await workOrderService.approveWorkOrder(req.params.id, req.body, req.user);
  emitWorkOrderChanged("approved", req.params.id, data);
  res.json({ success: true, data });
});

const reject = withHandler(async (req, res) => {
  const data = await workOrderService.rejectWorkOrder(req.params.id, req.body, req.user);
  emitWorkOrderChanged("rejected", req.params.id, data);
  res.json({ success: true, data });
});

const start = withHandler(async (req, res) => {
  const data = await workOrderService.startWorkOrder(req.params.id, req.user);
  emitWorkOrderChanged("started", req.params.id, data);
  res.json({ success: true, data });
});

const complete = withHandler(async (req, res) => {
  const data = await workOrderService.completeWorkOrder(req.params.id, req.body, req.user);
  emitWorkOrderChanged("completed", req.params.id, data);
  emitRealtime("maintenance_log.changed", {
    action: "created_from_work_order",
    id: req.params.id,
  });
  res.json({ success: true, data });
});

const signOff = withHandler(async (req, res) => {
  const data = await workOrderService.signOffWorkOrder(req.params.id, req.body, req.user);
  emitWorkOrderChanged("signed_off", req.params.id, data);
  res.json({ success: true, data });
});

module.exports = {
  create,
  list,
  getById,
  update,
  submit,
  approve,
  reject,
  start,
  complete,
  signOff,
};
