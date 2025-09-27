import express from 'express';
import { getSalons, getSalon, createSalon, updateSalon, deleteSalon, getMySalon, getSalonServices } from '../controllers/salonController.js';
import { protect } from '../middlewares/protect.js';
import { uploadSalonImages, handleUploadError } from '../middlewares/upload.js'; // Add this line to import the upload middleware
import { uploadSalonMedia } from '../controllers/salonController.js';
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
router.get("/:salonId/services", getSalonServices);
router.put("/:id", protect, uploadSalonMedia.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
]), updateSalon);
router.delete('/:id', protect, deleteSalon);
export default router;
