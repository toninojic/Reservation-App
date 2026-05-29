const bcrypt = require("bcryptjs");
const { getDb } = require("../db/database");
const { deleteUploadedFile } = require("../utils/uploads");

function publicAdminUser(user) {
  return {
    id: user.id,
    organization_name: user.organization_name,
    email: user.email,
    logo_path: user.logo_path,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    event_count: Number(user.event_count || 0)
  };
}

function listUsers(req, res) {
  const users = getDb()
    .prepare(
      `SELECT
        users.id,
        users.organization_name,
        users.email,
        users.logo_path,
        users.role,
        users.status,
        users.created_at,
        COUNT(events.id) AS event_count
       FROM users
       LEFT JOIN events ON events.user_id = users.id
       GROUP BY users.id
       ORDER BY
        CASE users.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        users.created_at DESC`
    )
    .all();

  return res.json({ users });
}

function getUserDetails(req, res) {
  const id = Number(req.params.id);
  const user = getDb()
    .prepare(
      `SELECT
        users.id,
        users.organization_name,
        users.email,
        users.logo_path,
        users.role,
        users.status,
        users.created_at,
        COUNT(events.id) AS event_count
       FROM users
       LEFT JOIN events ON events.user_id = users.id
       WHERE users.id = ?
       GROUP BY users.id`
    )
    .get(id);

  if (!user) {
    return res.status(404).json({ message: "Korisnik nije pronađen." });
  }

  return res.json({ user: publicAdminUser(user) });
}

function updateUserStatus(req, res) {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").trim();

  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Status nije ispravan." });
  }

  const database = getDb();
  const user = database.prepare("SELECT * FROM users WHERE id = ?").get(id);

  if (!user) {
    return res.status(404).json({ message: "Korisnik nije pronađen." });
  }

  if (user.role === "admin" && status !== "approved") {
    return res.status(400).json({ message: "Admin nalog mora ostati odobren." });
  }

  database
    .prepare("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(status, id);

  const updated = database
    .prepare(
      `SELECT id, organization_name, email, logo_path, role, status, created_at
       FROM users
       WHERE id = ?`
    )
    .get(id);

  return res.json({ user: updated, message: "Status naloga je ažuriran." });
}

function resetUserPassword(req, res) {
  const id = Number(req.params.id);
  const newPassword = String(req.body.password || "");

  if (newPassword.length < 8) {
    return res.status(400).json({ message: "Nova privremena lozinka mora imati najmanje 8 karaktera." });
  }

  const database = getDb();
  const user = database.prepare("SELECT id, role FROM users WHERE id = ?").get(id);

  if (!user) {
    return res.status(404).json({ message: "Korisnik nije pronađen." });
  }

  if (user.role !== "user") {
    return res.status(400).json({ message: "Lozinka se može resetovati samo organizacijama." });
  }

  const passwordHash = bcrypt.hashSync(newPassword, 12);
  database
    .prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(passwordHash, id);

  return res.json({ message: "Lozinka je uspešno resetovana." });
}

function deleteUser(req, res) {
  const id = Number(req.params.id);

  if (id === req.user.id) {
    return res.status(400).json({ message: "Ne možete obrisati sopstveni admin nalog." });
  }

  const database = getDb();
  const user = database.prepare("SELECT * FROM users WHERE id = ?").get(id);

  if (!user) {
    return res.status(404).json({ message: "Korisnik nije pronađen." });
  }

  const eventFiles = database.prepare("SELECT flyer_path FROM events WHERE user_id = ?").all(id);
  database.prepare("DELETE FROM users WHERE id = ?").run(id);

  deleteUploadedFile(user.logo_path);
  eventFiles.forEach((event) => deleteUploadedFile(event.flyer_path));

  return res.json({ message: "Nalog i njegove rezervacije su obrisani." });
}

module.exports = {
  deleteUser,
  getUserDetails,
  listUsers,
  resetUserPassword,
  updateUserStatus
};
