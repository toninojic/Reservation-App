const express = require("express");
const eventController = require("../controllers/eventController");
const { requireAuth } = require("../middleware/auth");
const { createUploader } = require("../utils/uploads");

const router = express.Router();
const flyerUpload = createUploader("flyers");

router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.post("/", requireAuth, flyerUpload.single("flyer"), eventController.createEvent);
router.put("/:id", requireAuth, flyerUpload.single("flyer"), eventController.updateEvent);
router.delete("/:id", requireAuth, eventController.deleteEvent);

module.exports = router;
