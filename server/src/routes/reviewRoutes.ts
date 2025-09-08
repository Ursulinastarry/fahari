import { Router } from "express";
import { protect } from "../middlewares/protect";
import {
  createReview,
  getReviews,
  deleteReview,
  getSalonRating,
  getOwnerReviews,
  getBookingReview,
  getReviewsBySalon
} from "../controllers/reviewsController";

const router = Router();

router.post("/", protect, createReview);
// router.get("/", getReviews);
router.get("/owner", protect, getOwnerReviews);
router.get("/rating/:salonId", getSalonRating);
router.get("/salon/:salonId", protect, getReviewsBySalon);

router.get("/:bookingId", protect, getBookingReview);
router.delete("/:id", protect, deleteReview);

export default router;
