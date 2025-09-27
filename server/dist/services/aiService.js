import axios from 'axios';
export const handleAiChat = async (userInput) => {
    const prompt = `
You're a salon AI assistant. Help the user choose a service time, salon, and confirm if they want home or salon service. Be friendly and helpful.

User: "${userInput}"
`;
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
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
export const generateConfirmationMessage = async (booking) => {
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
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
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
