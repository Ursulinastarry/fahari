// routes/aiChatRoutes.js
import express from 'express';
import { handleAIChat } from '../controllers/aiController.js';
import { protect } from '../middlewares/protect.js';
const router = express.Router();
// POST /api/ai-chat
router.post('/', protect, handleAIChat);
export default router;
