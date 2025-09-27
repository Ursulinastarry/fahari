import { Router } from "express";
import { protect } from "../middlewares/protect";
import { createAppointment, getAppointments, updateAppointment, } from "../controllers/appointmentController";
const router = Router();
router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.put("/:id", protect, updateAppointment);
export default router;
