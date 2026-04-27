process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_that_is_long_enough_123456";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCorsOrigin } = require("../server");

test("buildCorsOrigin allows configured origins", async () => {
  const originGuard = buildCorsOrigin(["http://localhost:5173"]);

  await new Promise((resolve, reject) => {
    originGuard("http://localhost:5173", (error, allowed) => {
      if (error) reject(error);
      try {
        assert.equal(allowed, true);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test("buildCorsOrigin rejects unknown origins", async () => {
  const originGuard = buildCorsOrigin(["http://localhost:5173"]);

  await assert.rejects(
    () => new Promise((resolve, reject) => {
      originGuard("http://evil.local", (error) => {
        if (error) reject(error);
        resolve();
      });
    }),
    /CORS blocked/
  );
});
