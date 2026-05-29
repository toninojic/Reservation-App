const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const logger = require("./logger");

const rootDir = path.join(__dirname, "..", "..");
const publicDir = path.join(rootDir, "public");
const uploadsDir = path.join(publicDir, "uploads");
const uploadFolders = {
  logos: path.join(uploadsDir, "logos"),
  flyers: path.join(uploadsDir, "flyers")
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const executableExtensions = new Set([
  ".bat",
  ".cmd",
  ".com",
  ".exe",
  ".js",
  ".msi",
  ".php",
  ".ps1",
  ".sh",
  ".vbs"
]);

function ensureUploadDirectories() {
  Object.values(uploadFolders).forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
}

function sizeLimitFromEnv(name, fallbackMb) {
  const value = Number(process.env[name] || fallbackMb);
  return Math.max(1, value) * 1024 * 1024;
}

function createUploader(kind) {
  const destination = uploadFolders[kind];
  if (!destination) {
    throw new Error("Nepoznat upload tip.");
  }

  const maxSize =
    kind === "logos"
      ? sizeLimitFromEnv("MAX_LOGO_SIZE_MB", 2)
      : sizeLimitFromEnv("MAX_FLYER_SIZE_MB", 5);

  const storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, destination);
    },
    filename(req, file, cb) {
      const ext = path.extname(path.basename(file.originalname || "")).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    }
  });

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter(req, file, cb) {
      const originalName = path.basename(file.originalname || "");
      const ext = path.extname(originalName).toLowerCase();
      const lowerName = originalName.toLowerCase();
      const hasExecutablePart = Array.from(executableExtensions).some((item) =>
        lowerName.includes(`${item}.`) || lowerName.endsWith(item)
      );

      if (hasExecutablePart || !allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(ext)) {
        return cb(new Error("UPLOAD_Dozvoljene su samo slike: JPG, PNG, WEBP ili GIF."));
      }

      return cb(null, true);
    }
  });
}

function fileToPublicPath(file) {
  if (!file) {
    return null;
  }

  const absolutePath = path.resolve(file.path);
  const relativeToUploads = path.relative(uploadsDir, absolutePath);
  if (relativeToUploads.startsWith("..") || path.isAbsolute(relativeToUploads)) {
    return null;
  }

  const relativePath = path.relative(publicDir, absolutePath).replace(/\\/g, "/");
  return `/${relativePath}`;
}

function deleteUploadedFile(publicPath) {
  if (!publicPath || typeof publicPath !== "string") {
    return;
  }

  const normalized = publicPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(publicDir, normalized);
  const relativeToUploads = path.relative(uploadsDir, absolutePath);

  if (relativeToUploads.startsWith("..") || path.isAbsolute(relativeToUploads)) {
    return;
  }

  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== "ENOENT") {
      logger.warn(`Nije moguće obrisati upload: ${absolutePath}`, err.message);
    }
  });
}

module.exports = {
  createUploader,
  deleteUploadedFile,
  ensureUploadDirectories,
  fileToPublicPath
};
