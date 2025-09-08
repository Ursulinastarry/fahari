"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const salonController_1 = require("../controllers/salonController");
const protect_1 = require("../middlewares/protect");
const router = express_1.default.Router();
router.get('/', salonController_1.getSalons);
router.post('/', protect_1.protect, salonController_1.createSalon);
router.get('/owner/me', protect_1.protect, salonController_1.getMySalon);
router.get('/:id', salonController_1.getSalon);
router.get("/:salonId/services", salonController_1.getSalonServices);
router.put('/:id', protect_1.protect, salonController_1.updateSalon);
router.delete('/:id', protect_1.protect, salonController_1.deleteSalon);
exports.default = router;
