let ioInstance = null;

function setIo(io) {
  ioInstance = io;
}

function getIo() {
  return ioInstance;
}

function emitRealtime(event, payload = {}) {
  if (!ioInstance) return;
  ioInstance.emit(event, {
    ...payload,
    at: new Date().toISOString(),
  });
}

module.exports = {
  setIo,
  getIo,
  emitRealtime,
};
