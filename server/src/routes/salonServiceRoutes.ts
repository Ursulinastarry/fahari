import { Router } from "express";
import { protect } from "../middlewares/protect";
import {
  addSalonService,
  updateSalonService,
  removeSalonService,
  getOwnerServices,
} from "../controllers/salonServicesController";

const router = Router();

router.post("/", protect, addSalonService);
router.get("/owner", protect, getOwnerServices);
router.put("/:id", protect, updateSalonService);
router.delete("/:id", protect, removeSalonService);

export default router;
