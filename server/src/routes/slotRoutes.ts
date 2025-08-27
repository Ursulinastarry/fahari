import { Router } from "express";
import { protect } from "../middlewares/protect";
import {
  createSlot,
  getSlots,
  getSalonSlots,
  updateSlot,
  deleteSlot,
} from "../controllers/slotsController";

const router = Router();

router.post("/", protect, createSlot);
router.get("/", getSlots);
router.get("/salons/:salonId", getSalonSlots);
router.put("/:id", protect, updateSlot);
router.delete("/:id", protect, deleteSlot);

export default router;
