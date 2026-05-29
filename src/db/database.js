const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");
const { isValidEmail, isValidPassword } = require("../utils/validation");

const rootDir = path.join(__dirname, "..", "..");
const dbPath = path.resolve(rootDir, process.env.DB_PATH || "./data/rezervacije.sqlite");
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
  const existingAdmin = database.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();

  if (existingAdmin) {
    return;
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@rezervacije.local").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "PromeniMe123!";

  if (logger.isProduction && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    throw new Error("ADMIN_EMAIL i ADMIN_PASSWORD moraju biti podeseni u produkciji.");
  }

  if (!isValidEmail(adminEmail) || !isValidPassword(adminPassword)) {
    throw new Error("Admin kredencijali nisu ispravni.");
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 12);

  database
    .prepare(
      `INSERT INTO users (organization_name, email, password_hash, role, status)
       VALUES (@organization_name, @email, @password_hash, 'admin', 'approved')`
    )
    .run({
      organization_name: "Administrator",
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
