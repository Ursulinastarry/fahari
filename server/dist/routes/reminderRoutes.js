import { Router } from "express";
import { protect } from "../middlewares/protect";
import { createReminder, getReminders, markReminderAsSent } from "../controllers/reminderController";
const router = Router();
router.post("/", protect, createReminder);
router.get("/", protect, getReminders);
router.put("/:id/sent", protect, markReminderAsSent);
export default router;
