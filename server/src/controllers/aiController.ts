// import { Request, Response } from 'express';
// import { handleAiChat } from '../services/aiService';

// export const askFahariAI = async (req: Request, res: Response) => {
//   try {
//     const { message } = req.body || {};
//       if (!message) {
//        return res.status(400).json({ error: "Missing message in body" });
// }

//     const aiResponse = await handleAiChat(message);
//     res.json({ response: aiResponse });
//   } catch (error) {
//     console.error('AI Error:', error);
//     res.status(500).json({ message: 'AI Assistant failed to respond' });
//   }
// };
