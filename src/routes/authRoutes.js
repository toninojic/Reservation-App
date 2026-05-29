const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { createUploader } = require("../utils/uploads");

const router = express.Router();
const logoUpload = createUploader("logos");
const authRateLimitOptions = {
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Previše pokušaja. Pokušajte ponovo za minut." }
};
const loginLimiter = rateLimit(authRateLimitOptions);
const registerLimiter = rateLimit(authRateLimitOptions);

router.post("/register", registerLimiter, logoUpload.single("logo"), authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);
router.put("/profile", requireAuth, logoUpload.single("logo"), authController.updateProfile);

module.exports = router;
