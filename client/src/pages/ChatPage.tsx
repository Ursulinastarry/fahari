import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I can help you with salon bookings, available services, and appointments. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate fetching live data from your API
  const fetchLiveData = async () => {
    try {
       const [salons, services, availabilities] = await Promise.all([
    fetch('https://fahari-production.up.railway.app/api/salons').then(r => r.json()),
    fetch('https://fahari-production.up.railway.app/api/salon-services').then(r => r.json()),
    fetch('https://fahari-production.up.railway.app/api/slots').then(r => r.json())
  ]);
  
  return { salons, services, availabilities };
    } catch (error) {
      console.error('Error fetching live data:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!apiKey) {
      alert('Please enter your Groq API key in settings first');
      setShowSettings(true);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Fetch live data from your API
      const liveData = await fetchLiveData();
      
      // Build context with live data
      const systemPrompt = `You are a helpful assistant for a salon booking website. 
Here is the current live data you can reference:

AVAILABLE SALONS:
${liveData?.salons?.map((s: { name: any; location: any; }) => `- ${s.name} (${s.location})`).join('\n') || 'Loading...'}

SERVICES OFFERED:
${liveData?.services?.map((s: { name: any; price: any; duration: any; }) => `- ${s.name}: ${s.price}, Duration: ${s.duration}`).join('\n') || 'Loading...'}

AVAILABLE TIME SLOTS:
Today: ${liveData?.availabilities?.today?.join(', ') || 'None'}
Tomorrow: ${liveData?.availabilities?.tomorrow?.join(', ') || 'None'}

Help users book appointments, answer questions about services, and provide information about salon locations and availability. Be friendly and concise.`;

      // Call Groq API
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not process that.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error:any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, there was an error: ${error.message}. Please check your API key and try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e:any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Salon Assistant</h1>
            <p className="text-sm text-gray-500">Powered by Groq AI</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          {showSettings ? 'Hide' : 'Show'} Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="max-w-2xl">
            <h3 className="font-semibold text-gray-800 mb-2">⚙️ Setup Required</h3>
            <p className="text-sm text-gray-600 mb-3">
              Get your free API key from <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.groq.com</a>
            </p>
            <input
              type="password"
              placeholder="Enter your Groq API key (gsk_...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 This key is stored in memory only and never sent anywhere except Groq's API
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user' 
                ? 'bg-blue-500' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500'
            }`}>
              {msg.role === 'user' ? (
                <User className="text-white" size={18} />
              ) : (
                <Bot className="text-white" size={18} />
              )}
            </div>
            <div
              className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="text-white" size={18} />
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
              <Loader2 className="animate-spin text-purple-500" size={20} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about services, availability, or book an appointment..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-xs text-center text-gray-500 mt-2">
          💡 Replace the fetchLiveData() function with your actual API endpoints
        </p>
      </div>
    </div>
  );
}