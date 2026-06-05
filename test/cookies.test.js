const test = require("node:test");
const assert = require("node:assert/strict");

const { parseCookieHeader } = require("../src/utils/cookies");

test("parseCookieHeader ignores malformed percent-encoding instead of throwing", () => {
  assert.doesNotThrow(() => parseCookieHeader("am_at=%E0%A4"));
  const cookies = parseCookieHeader("am_at=%E0%A4");
  assert.equal(cookies.am_at, "%E0%A4");
});
