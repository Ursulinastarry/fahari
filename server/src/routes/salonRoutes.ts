import express from 'express';
import { getSalons, getSalon,  createSalon, updateSalon, deleteSalon, getMySalon,getSalonServices } from '../controllers/salonController';
import { protect } from '../middlewares/protect';
const router = express.Router();

router.get('/', getSalons);
router.post('/', protect, createSalon);
router.get('/owner/me',protect,getMySalon)
router.get('/:id', getSalon);
router.get("/:salonId/services", getSalonServices);
router.put('/:id', protect, updateSalon);
router.delete('/:id', protect, deleteSalon);

export default router;





