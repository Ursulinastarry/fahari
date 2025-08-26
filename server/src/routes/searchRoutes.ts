import { Router } from "express";
import { searchSalons, searchServices } from "../controllers/searchController";

const router = Router();

router.get("/salons", searchSalons);
router.get("/services", searchServices);

export default router;
