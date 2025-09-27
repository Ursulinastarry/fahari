import { Router } from "express";
import { protect } from "../middlewares/protect.js";
import { createReminder, getReminders, markReminderAsSent } from "../controllers/reminderController.js";
const router = Router();
router.post("/", protect, createReminder);
router.get("/", protect, getReminders);
router.put("/:id/sent", protect, markReminderAsSent);
export default router;
