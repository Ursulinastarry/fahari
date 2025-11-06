 import { Router } from 'express';
import { initiatePayment, mpesaCallback, checkPaymentStatus } from '../controllers/paymentControllers';
import { protect } from '../middlewares/protect';

const router = Router();

router.post('/initiate', protect, initiatePayment);
router.post('/callback', mpesaCallback);
router.get('/status/:bookingId', protect, checkPaymentStatus);

export default router;