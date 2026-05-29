const express = require("express");
const adminController = require("../controllers/adminController");
const eventController = require("../controllers/eventController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(requireAdmin);
router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUserDetails);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.patch("/users/:id/password", adminController.resetUserPassword);
router.delete("/users/:id", adminController.deleteUser);
router.get("/events", eventController.listAllEvents);

module.exports = router;
