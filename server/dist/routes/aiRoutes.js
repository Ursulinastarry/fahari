// routes/aiChatRoutes.js
import express from 'express';
import { handleAIChat } from '../controllers/aiController.js';
const router = express.Router();
// POST /api/ai-chat
router.post('/', handleAIChat);
export default router;
