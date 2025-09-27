import { Router } from "express";
import { protect } from "../middlewares/protect";
import { createPayment, updatePaymentStatus } from "../controllers/paymentControllers";
const router = Router();
router.post("/", protect, createPayment);
router.put("/:id/status", protect, updatePaymentStatus);
export default router;
