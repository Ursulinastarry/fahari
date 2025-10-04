import { Router } from "express";
import { protect } from "../middlewares/protect";
import {
  addSalonService,
  updateSalonService,
  removeSalonService,
  getOwnerServices,
  getSalonServices,
} from "../controllers/salonServicesController";

const router = Router();

router.get("/owner", protect, getOwnerServices);
router.post("/:salonId", protect, addSalonService);
router.get("/:salonId", getSalonServices);
router.put("/:id", protect, updateSalonService);
router.delete("/:id", protect, removeSalonService);

export default router;
