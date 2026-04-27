const { requireObjectId } = require("../utils/validators");

function validateObjectIdParam(paramName = "id") {
  return (req, _res, next) => {
    try {
      requireObjectId(req.params[paramName], paramName);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = validateObjectIdParam;
