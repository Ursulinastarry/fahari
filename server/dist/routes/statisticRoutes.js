import { Router } from "express";
import { protect } from "../middlewares/protect";
import { getSalonStatistics, getPlatformStatistics } from "../controllers/statisticsController";
const router = Router();
router.get("/salon/:id", protect, getSalonStatistics);
router.get("/platform", protect, getPlatformStatistics);
export default router;
