const Sequence = require("../models/Sequence");

async function generateWoCode(prefix = "WO") {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dayKey = `${prefix}-${y}${m}${d}`;

  const sequence = await Sequence.findOneAndUpdate(
    { key: dayKey },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  const order = String(sequence.value).padStart(5, "0");
  return `${dayKey}-${order}`;
}

module.exports = { generateWoCode };
