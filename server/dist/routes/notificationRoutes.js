"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notificationsController_1 = require("../controllers/notificationsController");
const protect_1 = require("../middlewares/protect");
const router = express_1.default.Router();
router.get("/", protect_1.protect, notificationsController_1.getMyNotifications);
router.patch("/:id/read", protect_1.protect, notificationsController_1.markAsRead);
router.delete("/:id", protect_1.protect, notificationsController_1.deleteNotification);
router.delete("/", protect_1.protect, notificationsController_1.clearMyNotifications);
exports.default = router;
