import express from "express";
import { getAllServices, createService, updateService, deleteService, } from "../controllers/servicesContoller.js";
import { protect } from "../middlewares/protect.js";
const router = express.Router();
// Public - anyone can see services
router.get("/", getAllServices);
// Admin only
router.post("/", protect, createService);
router.put("/:id", protect, updateService);
router.delete("/:id", protect, deleteService);
export default router;
