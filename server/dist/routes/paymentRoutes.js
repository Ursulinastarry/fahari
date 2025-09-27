import { Router } from "express";
import { protect } from "../middlewares/protect.js";
import { createPayment, updatePaymentStatus } from "../controllers/paymentControllers.js";
const router = Router();
router.post("/", protect, createPayment);
router.put("/:id/status", protect, updatePaymentStatus);
export default router;
