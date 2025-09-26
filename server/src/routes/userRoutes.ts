import express from "express";
import { createUser, getAllUsers, getUserById, updateUser, deleteUser, loginUser,logoutUser,approveUser, getMe, suspendUser} from "../controllers/userController";
import { protect } from "../middlewares/protect";
import { uploadUserAvatar } from "../middlewares/upload";
const router = express.Router();

router.get("/me", protect,getMe);
router.post("/register", createUser);
router.post("/login", loginUser);
router.post("/logout",logoutUser);
router.put("/:id/approve", protect,approveUser);
router.put("/:id/suspend", protect,suspendUser);
router.get("/",  getAllUsers);
router.get("/:id", getUserById);
router.put(
  "/:id",protect,
  uploadUserAvatar.single("avatar"), // Handle file upload
  updateUser
);

router.delete("/:id", protect, deleteUser);

export default router;
