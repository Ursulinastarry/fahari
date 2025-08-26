import { Router } from "express";
import { protect } from "../middlewares/protect";
import {
  createReview,
  getReviews,
  deleteReview,
  getSalonRating
} from "../controllers/reviewsController";

const router = Router();

router.post("/", protect, createReview);
router.get("/", getReviews);
router.delete("/:id", protect, deleteReview);
router.get("/:salonId/rating", getSalonRating);


export default router;
