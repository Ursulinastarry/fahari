// routes/aiChatRoutes.js
import express from 'express';
import { handleAIChat } from '../controllers/aiController';
import { protect } from '../middlewares/protect';
const router = express.Router();

// POST /api/ai-chat
router.post('/ai-chat', protect, handleAIChat);

export default router;
