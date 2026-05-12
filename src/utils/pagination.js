const { normalizeNumber } = require("./validators");

function parsePagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit || 20;
  const maxLimit = options.maxLimit || 200;
  const paginated = String(query.paginated || "").toLowerCase() === "true";

  const page = Math.max(
    1,
    normalizeNumber(query.page ?? 1, "page", { min: 1, nullable: false })
  );
  const limit = Math.min(
    maxLimit,
    Math.max(
      1,
      normalizeNumber(query.limit ?? defaultLimit, "limit", {
        min: 1,
        nullable: false,
      })
    )
  );

  return {
    paginated,
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

module.exports = { parsePagination };

