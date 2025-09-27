import { Router } from "express";
import { protect } from "../middlewares/protect.js";
import { createAppointment, getAppointments, updateAppointment, } from "../controllers/appointmentController.js";
const router = Router();
router.post("/", protect, createAppointment);
router.get("/", protect, getAppointments);
router.put("/:id", protect, updateAppointment);
export default router;
