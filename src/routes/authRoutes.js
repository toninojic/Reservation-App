const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { createUploader } = require("../utils/uploads");

const router = express.Router();
const logoUpload = createUploader("logos");

router.post("/register", logoUpload.single("logo"), authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);
router.put("/profile", requireAuth, logoUpload.single("logo"), authController.updateProfile);

module.exports = router;
