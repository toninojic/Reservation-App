const express = require("express");
const eventController = require("../controllers/eventController");
const { requireAuth } = require("../middleware/auth");
const { createUploader } = require("../utils/uploads");

const router = express.Router();
const flyerUpload = createUploader("flyers");

router.use(requireAuth);
router.get("/", eventController.listEvents);
router.get("/:id", eventController.getEvent);
router.post("/", flyerUpload.single("flyer"), eventController.createEvent);
router.put("/:id", flyerUpload.single("flyer"), eventController.updateEvent);
router.delete("/:id", eventController.deleteEvent);

module.exports = router;
