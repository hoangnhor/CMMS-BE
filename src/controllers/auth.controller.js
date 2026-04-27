const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { getEnv } = require("../config/env");
const { assertAllowedFields, requireEmail, requireString } = require("../utils/validators");

const env = getEnv();

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function login(req, res, next) {
  try {
    assertAllowedFields(req.body, ["email", "password"], "Thông tin đăng nhập");
    const email = requireEmail(req.body.email);
    const password = requireString(req.body.password, "Mật khẩu", { max: 128 });
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Sai thông tin đăng nhập" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Sai thông tin đăng nhập" });
    }

    const token = signToken(user);
    return res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res) {
  const { _id, name, email, role, isActive } = req.user;
  return res.json({ success: true, data: { _id, name, email, role, isActive } });
}

module.exports = {
  login,
  me,
};

