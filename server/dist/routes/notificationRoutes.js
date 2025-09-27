import express from "express";
import { getMyNotifications, markAsRead, deleteNotification, clearMyNotifications } from "../controllers/notificationsController.js";
import { protect } from "../middlewares/protect.js";
const router = express.Router();
router.get("/", protect, getMyNotifications);
router.patch("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);
router.delete("/", protect, clearMyNotifications);
export default router;
