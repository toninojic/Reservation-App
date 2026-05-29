require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const SQLiteStoreFactory = require("connect-sqlite3");
const helmet = require("helmet");
const morgan = require("morgan");

const { initDatabase, createDefaultAdmin } = require("./src/db/database");
const authRoutes = require("./src/routes/authRoutes");
const eventRoutes = require("./src/routes/eventRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const { ensureUploadDirectories } = require("./src/utils/uploads");
const logger = require("./src/utils/logger");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const sessionSecret = process.env.SESSION_SECRET || "lokalna-dev-tajna-promeni-u-env";
const sessionDbPath = path.resolve(__dirname, process.env.SESSION_DB_PATH || "./data/sessions.sqlite");
const sessionDbDir = path.dirname(sessionDbPath);
const sessionDbFile = path.basename(sessionDbPath);
const SQLiteStore = SQLiteStoreFactory(session);

if (logger.isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET mora biti podesen u produkciji.");
}

ensureUploadDirectories();
initDatabase();
createDefaultAdmin();
fs.mkdirSync(sessionDbDir, { recursive: true });

const sessionStore = new SQLiteStore({
  db: sessionDbFile,
  dir: sessionDbDir,
  table: "sessions"
});

if (typeof sessionStore.on === "function") {
  sessionStore.on("error", (error) => {
    logger.error(logger.isProduction ? error.message : error.stack || error);
  });
}

app.disable("x-powered-by");
if (logger.isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    referrerPolicy: { policy: "no-referrer" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        connectSrc: ["'self'"]
      }
    }
  })
);

if (!logger.isProduction) {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: "rezervacije.sid",
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Fajl je prevelik." });
  }

  if (err && err.message && err.message.startsWith("UPLOAD_")) {
    return res.status(400).json({ message: err.message.replace("UPLOAD_", "") });
  }

  logger.error(logger.isProduction ? err.message : err.stack || err);

  const response = { message: "Došlo je do greške na serveru." };
  if (!logger.isProduction) {
    response.error = err.message;
    response.stack = err.stack;
  }

  return res.status(500).json(response);
});

app.listen(port, () => {
  logger.info(`Rezervacija kalendar radi na http://localhost:${port}`);
});
