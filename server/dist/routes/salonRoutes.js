"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const salonController_1 = require("../controllers/salonController");
const protect_1 = require("../middlewares/protect");
const upload_1 = require("../middlewares/upload"); // Add this line to import the upload middleware
const salonController_2 = require("../controllers/salonController");
const router = express_1.default.Router();
router.get('/', salonController_1.getSalons);
router.post("/", protect_1.protect, (req, res, next) => {
    (0, upload_1.uploadSalonImages)(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            return (0, upload_1.handleUploadError)(err, req, res, next);
        }
        console.log("==== After Multer ====");
        console.log("BODY:", req.body);
        console.log("FILES:", req.files);
        console.log("======================");
        next();
    });
}, salonController_1.createSalon);
router.get('/owner/me', protect_1.protect, salonController_1.getMySalon);
router.get('/:id', salonController_1.getSalon);
router.get("/:salonId/services", salonController_1.getSalonServices);
router.put("/:id", protect_1.protect, salonController_2.uploadSalonMedia.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
]), salonController_1.updateSalon);
router.delete('/:id', protect_1.protect, salonController_1.deleteSalon);
exports.default = router;
