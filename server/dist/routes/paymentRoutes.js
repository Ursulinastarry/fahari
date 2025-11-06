import { Router } from 'express';
import { initiatePayment, mpesaCallback, checkPaymentStatus } from '../controllers/paymentControllers.js';
import { protect } from '../middlewares/protect.js';
const router = Router();
router.post('/initiate', protect, initiatePayment);
router.post('/callback', mpesaCallback);
router.get('/status/:bookingId', protect, checkPaymentStatus);
export default router;
