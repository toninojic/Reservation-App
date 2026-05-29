require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { initDatabase, createDefaultAdmin } = require("./src/db/database");
const authRoutes = require("./src/routes/authRoutes");
const eventRoutes = require("./src/routes/eventRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const { ensureUploadDirectories } = require("./src/utils/uploads");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

ensureUploadDirectories();
initDatabase();
createDefaultAdmin();

app.disable("x-powered-by");
app.use(
  helmet({
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
app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    name: "rezervacije.sid",
    secret: process.env.SESSION_SECRET || "lokalna-dev-tajna-promeni-u-env",
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

app.use("/api/auth", authLimiter, authRoutes);
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

  console.error(err);
  return res.status(500).json({ message: "Došlo je do greške na serveru." });
});

app.listen(port, () => {
  console.log(`Rezervacija kalendar radi na http://localhost:${port}`);
});
