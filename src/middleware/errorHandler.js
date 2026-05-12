function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const isProduction = req.app?.get("env") === "production";
  let status = err.statusCode || 500;
  let message = err.message || "Lỗi hệ thống";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join("; ");
  } else if (err.name === "CastError") {
    status = 400;
    message = "Dữ liệu đầu vào không hợp lệ";
  } else if (err.code === 11000) {
    status = 409;
    message = "Dữ liệu đã tồn tại";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Token không hợp lệ hoặc đã hết hạn";
  }

  if (status >= 500) {
    console.error("[error]", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status,
      message: err.message,
      stack: err.stack,
    });
  }

  if (isProduction && status >= 500) {
    message = "Lỗi hệ thống";
  }

  return res.status(status).json({
    success: false,
    message,
    requestId: req.id,
  });
}

module.exports = errorHandler;
