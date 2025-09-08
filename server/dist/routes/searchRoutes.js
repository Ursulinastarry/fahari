"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const searchController_1 = require("../controllers/searchController");
const router = (0, express_1.Router)();
router.get("/salons", searchController_1.searchSalons);
router.get("/services", searchController_1.searchServices);
exports.default = router;
