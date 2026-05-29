const bcrypt = require("bcryptjs");
const { getDb } = require("../db/database");
const { deleteUploadedFile, fileToPublicPath } = require("../utils/uploads");
const { findSessionUser } = require("../middleware/auth");
const { isPlainObject, isValidEmail, isValidPassword, normalizeText } = require("../utils/validation");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    organization_name: user.organization_name,
    email: user.email,
    logo_path: user.logo_path,
    role: user.role,
    status: user.status
  };
}

function register(req, res) {
  if (!isPlainObject(req.body)) {
    deleteUploadedFile(fileToPublicPath(req.file));
    return res.status(400).json({ message: "Zahtev nije ispravan." });
  }

  const organizationName = normalizeText(req.body.organization_name, 160);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const logoPath = fileToPublicPath(req.file);

  if (!organizationName || !email || !password) {
    deleteUploadedFile(logoPath);
    return res.status(400).json({ message: "Naziv organizacije, email i lozinka su obavezni." });
  }

  if (organizationName.length > 160) {
    deleteUploadedFile(logoPath);
    return res.status(400).json({ message: "Naziv organizacije može imati najviše 160 karaktera." });
  }

  if (!isValidEmail(email)) {
    deleteUploadedFile(logoPath);
    return res.status(400).json({ message: "Unesite ispravnu email adresu." });
  }

  if (!isValidPassword(password)) {
    deleteUploadedFile(logoPath);
    return res.status(400).json({ message: "Lozinka mora imati između 8 i 128 karaktera." });
  }

  const database = getDb();
  const existing = database.prepare("SELECT id FROM users WHERE email = ?").get(email);

  if (existing) {
    deleteUploadedFile(logoPath);
    return res.status(409).json({ message: "Nalog sa ovom email adresom već postoji." });
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  database
    .prepare(
      `INSERT INTO users (organization_name, email, password_hash, logo_path, role, status)
       VALUES (?, ?, ?, ?, 'user', 'pending')`
    )
    .run(organizationName, email, passwordHash, logoPath);

  return res.status(201).json({
    message: "Registracija je uspešna. Nalog čeka odobrenje administratora."
  });
}

function login(req, res) {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ message: "Zahtev nije ispravan." });
  }

  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email i lozinka su obavezni." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Unesite ispravnu email adresu." });
  }

  if (password.length > 128) {
    return res.status(400).json({ message: "Lozinka nije ispravna." });
  }

  const user = getDb()
    .prepare(
      `SELECT id, organization_name, email, logo_path, role, status, password_hash
       FROM users
       WHERE email = ?`
    )
    .get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Pogrešan email ili lozinka." });
  }

  if (user.status === "pending") {
    return res.status(403).json({ message: "Nalog čeka odobrenje administratora." });
  }

  if (user.status === "rejected") {
    return res.status(403).json({ message: "Nalog je odbijen. Obratite se administratoru." });
  }

  req.session.userId = user.id;
  return res.json({ user: publicUser(user) });
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("rezervacije.sid");
    return res.json({ message: "Uspešno ste se odjavili." });
  });
}

function me(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Niste prijavljeni." });
  }

  const user = findSessionUser(req.session.userId);
  if (!user || user.status !== "approved") {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Sesija nije važeća." });
  }

  return res.json({ user: publicUser(user) });
}

function updateProfile(req, res) {
  if (req.user.role !== "user") {
    const uploadedLogoPath = fileToPublicPath(req.file);
    deleteUploadedFile(uploadedLogoPath);
    return res.status(403).json({ message: "Samo organizacije mogu menjati profil." });
  }

  if (!isPlainObject(req.body)) {
    const uploadedLogoPath = fileToPublicPath(req.file);
    deleteUploadedFile(uploadedLogoPath);
    return res.status(400).json({ message: "Zahtev nije ispravan." });
  }

  const organizationName = normalizeText(req.body.organization_name, 160);
  const newLogoPath = fileToPublicPath(req.file);

  if (!organizationName) {
    deleteUploadedFile(newLogoPath);
    return res.status(400).json({ message: "Naziv organizacije je obavezan." });
  }

  if (organizationName.length > 160) {
    deleteUploadedFile(newLogoPath);
    return res.status(400).json({ message: "Naziv organizacije može imati najviše 160 karaktera." });
  }

  const database = getDb();
  const existing = database.prepare("SELECT id, logo_path FROM users WHERE id = ?").get(req.user.id);

  if (!existing) {
    deleteUploadedFile(newLogoPath);
    return res.status(404).json({ message: "Nalog nije pronađen." });
  }

  const logoPath = newLogoPath || existing.logo_path;

  database
    .prepare(
      `UPDATE users
       SET organization_name = ?, logo_path = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(organizationName, logoPath, req.user.id);

  if (newLogoPath && existing.logo_path) {
    deleteUploadedFile(existing.logo_path);
  }

  const updated = findSessionUser(req.user.id);
  return res.json({
    user: publicUser(updated),
    message: "Izmene profila su sačuvane."
  });
}

module.exports = {
  login,
  logout,
  me,
  register,
  updateProfile
};
