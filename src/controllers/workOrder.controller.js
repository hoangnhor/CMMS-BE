const workOrderService = require("../services/workOrder.service");
const { emitRealtime } = require("../realtime/io");

async function create(req, res, next) {
  try {
    const data = await workOrderService.createWorkOrder(req.body, req.user);
    emitRealtime("work_order.changed", {
      action: "created",
      id: data?._id || data?.workOrder?._id || null,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const data = await workOrderService.listWorkOrders(req.query, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const data = await workOrderService.getWorkOrderById(req.params.id, req.user);
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const data = await workOrderService.updateWorkOrder(req.params.id, req.body, req.user);
    emitRealtime("work_order.changed", {
      action: "updated",
      id: req.params.id,
      status: data?.status || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function submit(req, res, next) {
  try {
    const data = await workOrderService.submitForApproval(req.params.id, req.user);
    emitRealtime("work_order.changed", {
      action: "submitted",
      id: req.params.id,
      status: data?.status || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function approve(req, res, next) {
  try {
    const data = await workOrderService.approveWorkOrder(req.params.id, req.body, req.user);
    emitRealtime("work_order.changed", {
      action: "approved",
      id: req.params.id,
      status: data?.status || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function reject(req, res, next) {
  try {
    const data = await workOrderService.rejectWorkOrder(req.params.id, req.body, req.user);
    emitRealtime("work_order.changed", {
      action: "rejected",
      id: req.params.id,
      status: data?.status || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function start(req, res, next) {
  try {
    const data = await workOrderService.startWorkOrder(req.params.id, req.user);
    emitRealtime("work_order.changed", {
      action: "started",
      id: req.params.id,
      status: data?.status || null,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function complete(req, res, next) {
  try {
    const data = await workOrderService.completeWorkOrder(req.params.id, req.body, req.user);
    emitRealtime("work_order.changed", {
      action: "completed",
      id: req.params.id,
      status: data?.status || null,
    });
    emitRealtime("maintenance_log.changed", {
      action: "created_from_work_order",
      id: req.params.id,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

async function signOff(req, res, next) {
  try {
    const data = await workOrderService.signOffWorkOrder(req.params.id, req.body, req.user);
    emitRealtime("work_order.changed", {
      action: "signed_off",
      id: req.params.id,
      status: data?.status || null,
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
  submit,
  approve,
  reject,
  start,
  complete,
  signOff,
};
