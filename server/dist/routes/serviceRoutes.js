"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const servicesContoller_1 = require("../controllers/servicesContoller");
const protect_1 = require("../middlewares/protect");
const router = express_1.default.Router();
// Public - anyone can see services
router.get("/", servicesContoller_1.getAllServices);
// Admin only
router.post("/", protect_1.protect, servicesContoller_1.createService);
router.put("/:id", protect_1.protect, servicesContoller_1.updateService);
router.delete("/:id", protect_1.protect, servicesContoller_1.deleteService);
exports.default = router;
