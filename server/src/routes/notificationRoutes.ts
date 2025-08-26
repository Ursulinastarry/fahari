import express from "express";
import {
  getMyNotifications,
  markAsRead,
  deleteNotification,
  clearMyNotifications
} from "../controllers/notificationsController";
import { protect } from "../middlewares/protect";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.patch("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);
router.delete("/", protect, clearMyNotifications);

export default router;
