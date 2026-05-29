const mongoose = require("mongoose");

const roles = ["admin", "site_manager", "technician", "accountant"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: roles, required: true },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("User", userSchema);
