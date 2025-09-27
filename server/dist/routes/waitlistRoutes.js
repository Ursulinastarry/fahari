import { Router } from "express";
import { protect } from "../middlewares/protect.js";
import { addToWaitlist, getWaitlist, removeFromWaitlist, } from "../controllers/waitlistController.js";
const router = Router();
router.post("/", protect, addToWaitlist);
router.get("/", protect, getWaitlist);
router.delete("/:id", protect, removeFromWaitlist);
export default router;
