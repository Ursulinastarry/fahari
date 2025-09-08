"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateConfirmationMessage = exports.handleAiChat = void 0;
const axios_1 = __importDefault(require("axios"));
const handleAiChat = async (userInput) => {
    const prompt = `
You're a salon AI assistant. Help the user choose a service time, salon, and confirm if they want home or salon service. Be friendly and helpful.

User: "${userInput}"
`;
    const response = await axios_1.default.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        contents: [
            {
                parts: [{ text: prompt }]
            }
        ]
    }, {
        headers: {
            'Content-Type': 'application/json',
        },
        params: {
            key: process.env.GEMINI_API_KEY,
        }
    });
    return response.data.candidates[0].content.parts[0].text;
};
exports.handleAiChat = handleAiChat;
const generateConfirmationMessage = async (booking) => {
    const date = new Date(booking.startTime).toLocaleDateString();
    const time = new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const service = booking.service.name;
    const location = booking.location;
    const salon = booking.provider.name;
    const prompt = `
A customer has paid for a salon service.

Service: ${service}
Salon: ${salon}
Location: ${location}
Date: ${date}
Time: ${time}

Write a friendly confirmation message as Fahari AI.
`;
    const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data.choices[0].message.content;
};
exports.generateConfirmationMessage = generateConfirmationMessage;
