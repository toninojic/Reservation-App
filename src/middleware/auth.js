const { getDb } = require("../db/database");
const { parsePositiveInteger } = require("../utils/validation");

function findSessionUser(userId) {
  const id = parsePositiveInteger(userId);
  if (!id) {
    return null;
  }

  return getDb()
    .prepare(
      `SELECT id, organization_name, email, logo_path, role, status, created_at
       FROM users
       WHERE id = ?`
    )
    .get(id);
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Morate biti prijavljeni." });
  }

  const user = findSessionUser(req.session.userId);

  if (!user || user.status !== "approved") {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Sesija više nije važeća." });
  }

  req.user = user;
  return next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Nemate pristup admin panelu." });
    }

    return next();
  });
}

module.exports = {
  findSessionUser,
  requireAuth,
  requireAdmin
};
