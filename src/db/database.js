const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");
const { isValidEmail, isValidPassword } = require("../utils/validation");

const rootDir = path.join(__dirname, "..", "..");
const dbPath = path.resolve(rootDir, process.env.DB_PATH || "./data/rezervacije.sqlite");
const defaultAdminEmail = "admin@rezervacije.local";
const defaultAdminPassword = "PromeniMe123!";
const defaultAdminName = "Administrator";
let db;

function getDb() {
  if (!db) {
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
  }

  return db;
}

function initDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      logo_path TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_date TEXT NOT NULL UNIQUE,
      event_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      location TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      description TEXT,
      flyer_path TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
    CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
  `);
}

function createDefaultAdmin() {
  const database = getDb();
  const existingAdmin = database
    .prepare("SELECT id, email, password_hash FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
    .get();
  const envAdminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const envAdminPassword = String(process.env.ADMIN_PASSWORD || "");
  const hasEnvAdminEmail = envAdminEmail.length > 0;
  const hasEnvAdminPassword = envAdminPassword.length > 0;

  if (logger.isProduction && (!hasEnvAdminEmail || !hasEnvAdminPassword)) {
    throw new Error("ADMIN_EMAIL i ADMIN_PASSWORD moraju biti podeseni u produkciji.");
  }

  if (hasEnvAdminEmail !== hasEnvAdminPassword) {
    throw new Error("ADMIN_EMAIL i ADMIN_PASSWORD moraju biti podeseni zajedno.");
  }

  if (existingAdmin && !hasEnvAdminEmail && !hasEnvAdminPassword) {
    return;
  }

  const adminEmail = (hasEnvAdminEmail ? envAdminEmail : defaultAdminEmail).toLowerCase();
  const adminPassword = hasEnvAdminPassword ? envAdminPassword : defaultAdminPassword;

  if (!isValidEmail(adminEmail) || !isValidPassword(adminPassword)) {
    throw new Error("Admin kredencijali nisu ispravni.");
  }

  const userWithAdminEmail = database
    .prepare("SELECT id, role, password_hash FROM users WHERE email = ?")
    .get(adminEmail);

  if (userWithAdminEmail && userWithAdminEmail.role !== "admin") {
    throw new Error("ADMIN_EMAIL je vec zauzet korisnickim nalogom.");
  }

  if (userWithAdminEmail) {
    const passwordHash = bcrypt.compareSync(adminPassword, userWithAdminEmail.password_hash)
      ? userWithAdminEmail.password_hash
      : bcrypt.hashSync(adminPassword, 12);

    database
      .prepare(
        `UPDATE users
         SET organization_name = @organization_name,
             password_hash = @password_hash,
             role = 'admin',
             status = 'approved',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`
      )
      .run({
        id: userWithAdminEmail.id,
        organization_name: defaultAdminName,
        password_hash: passwordHash
      });

    logger.info(`Admin nalog je sinhronizovan sa ADMIN_EMAIL: ${adminEmail}`);
    return;
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 12);

  if (existingAdmin) {
    database
      .prepare(
        `UPDATE users
         SET organization_name = @organization_name,
             email = @email,
             password_hash = @password_hash,
             role = 'admin',
             status = 'approved',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = @id`
      )
      .run({
        id: existingAdmin.id,
        organization_name: defaultAdminName,
        email: adminEmail,
        password_hash: passwordHash
      });

    logger.info(`Admin nalog je azuriran iz ADMIN_EMAIL: ${adminEmail}`);
    return;
  }

  database
    .prepare(
      `INSERT INTO users (organization_name, email, password_hash, role, status)
       VALUES (@organization_name, @email, @password_hash, 'admin', 'approved')`
    )
    .run({
      organization_name: defaultAdminName,
      email: adminEmail,
      password_hash: passwordHash
    });

  logger.info(`Kreiran je podrazumevani admin nalog: ${adminEmail}`);
}

module.exports = {
  getDb,
  initDatabase,
  createDefaultAdmin
};
