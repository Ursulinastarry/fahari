import { Router } from "express";
import { protect } from "../middlewares/protect";
import {
  createBooking,
  getBookings,
  updateBooking,
  getOwnerBookings,
  getMyBookings,
  cancelBooking
} from "../controllers/bookingController";

const router = Router();

router.post("/", protect, createBooking);
router.get("/", protect, getBookings);
router.get("/owner", protect, getOwnerBookings);
router.get("/me", protect, getMyBookings);
router.patch("/:id/reschedule", protect, updateBooking);
router.patch("/:id/cancel", protect, cancelBooking);

export default router;

