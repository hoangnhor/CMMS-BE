let ioInstance = null;

const EVENT_ROLE_SCOPES = {
  "user.changed": ["admin"],
  "pm_schedule.changed": ["admin", "site_manager"],
  "maintenance_log.changed": ["admin", "site_manager", "accountant"],
};

function getEventRooms(event) {
  const roles = EVENT_ROLE_SCOPES[event];
  if (!roles) return [];
  return roles.map((role) => `role:${role}`);
}

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  return ioInstance;
}

function emitRealtime(event, payload = {}) {
  if (!ioInstance) return;

  const message = {
    ...payload,
    at: new Date().toISOString(),
  };

  const rooms = getEventRooms(event);
  if (rooms.length > 0 && typeof ioInstance.to === "function") {
    let target = ioInstance;
    for (const room of rooms) {
      if (typeof target.to !== "function") break;
      target = target.to(room);
    }
    if (typeof target.emit === "function") {
      target.emit(event, message);
      return;
    }
  }

  if (typeof ioInstance.emit === "function") {
    ioInstance.emit(event, message);
  }
}

module.exports = {
  getEventRooms,
  setIo,
  getIo,
  emitRealtime,
};
