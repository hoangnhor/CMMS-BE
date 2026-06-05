const test = require("node:test");
const assert = require("node:assert/strict");

const { emitRealtime, getEventRooms, setIo } = require("../src/realtime/io");

test("getEventRooms scopes sensitive events to role rooms", () => {
  assert.deepEqual(getEventRooms("user.changed"), ["role:admin"]);
  assert.deepEqual(getEventRooms("pm_schedule.changed"), ["role:admin", "role:site_manager"]);
  assert.deepEqual(getEventRooms("maintenance_log.changed"), [
    "role:admin",
    "role:site_manager",
    "role:accountant",
  ]);
  assert.deepEqual(getEventRooms("work_order.changed"), []);
});

test("emitRealtime targets role rooms when scoped", () => {
  const emitted = [];
  const fakeIo = {
    to(room) {
      emitted.push({ type: "to", room });
      return this;
    },
    emit(event, payload) {
      emitted.push({ type: "emit", event, payload });
    },
  };

  setIo(fakeIo);
  emitRealtime("user.changed", { action: "deleted" });

  const emittedAt = emitted[1].payload.at;
  assert.deepEqual(emitted, [
    { type: "to", room: "role:admin" },
    {
      type: "emit",
      event: "user.changed",
      payload: {
        action: "deleted",
        at: emittedAt,
      },
    },
  ]);
});

test("emitRealtime falls back to broadcast for non-scoped events", () => {
  const emitted = [];
  const fakeIo = {
    emit(event, payload) {
      emitted.push({ event, payload });
    },
  };

  setIo(fakeIo);
  emitRealtime("work_order.changed", { action: "updated" });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].event, "work_order.changed");
  assert.equal(emitted[0].payload.action, "updated");
  assert.ok(emitted[0].payload.at);
});
