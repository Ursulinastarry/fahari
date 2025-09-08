"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const protect_1 = require("../middlewares/protect");
const paymentControllers_1 = require("../controllers/paymentControllers");
const router = (0, express_1.Router)();
router.post("/", protect_1.protect, paymentControllers_1.createPayment);
router.put("/:id/status", protect_1.protect, paymentControllers_1.updatePaymentStatus);
exports.default = router;
