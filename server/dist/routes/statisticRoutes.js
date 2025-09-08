"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const protect_1 = require("../middlewares/protect");
const statisticsController_1 = require("../controllers/statisticsController");
const router = (0, express_1.Router)();
router.get("/salon/:id", protect_1.protect, statisticsController_1.getSalonStatistics);
router.get("/platform", protect_1.protect, statisticsController_1.getPlatformStatistics);
exports.default = router;
