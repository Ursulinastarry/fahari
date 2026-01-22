import express from 'express';
import { getSalons, getSalon, createSalon, updateSalon, deleteSalon, getMySalon, approveSalon, suspendSalon } from '../controllers/salonController.js';
import { protect } from '../middlewares/protect.js';
import { uploadSalonImages, handleUploadError } from '../middlewares/upload.js';
const router = express.Router();
router.get('/', getSalons);
router.post("/", protect, (req, res, next) => {
    uploadSalonImages(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            return handleUploadError(err, req, res, next);
        }
        console.log("==== After Multer ====");
        console.log("BODY:", req.body);
        console.log("FILES:", req.files);
        console.log("======================");
        next();
    });
}, createSalon);
router.get('/owner/me', protect, getMySalon);
router.get('/:id', getSalon);
router.put('/:id/approve', protect, approveSalon);
router.put('/:id/suspend', protect, suspendSalon);
router.put("/:id", protect, uploadSalonImages, handleUploadError, updateSalon);
router.delete('/:id', protect, deleteSalon);
export default router;
