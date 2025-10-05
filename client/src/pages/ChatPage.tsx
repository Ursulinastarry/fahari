import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X } from 'lucide-react';
interface AIAssistantProps {
  userRole?: 'CLIENT' | 'SALON_OWNER' | 'ADMIN';
  userId?: string;
  onClose?: () => void;
}
export default function AIAssistant({ userRole = 'CLIENT', userId, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: getWelcomeMessage(userRole)
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function getWelcomeMessage(role: string) {
    if (role === 'CLIENT') {
      return 'Hello! I can help you find salons, book appointments, check available slots, and answer questions about our services. How can I assist you today?';
    } else if (role === 'SALON_OWNER') {
      return 'Hello! I can help you manage your salon appointments, track revenue, manage slots, and answer questions about your business. What would you like to know?';
    } else if (role === 'ADMIN') {
      return 'Hello ADMIN! I can provide platform analytics, salon performance data, user statistics, and any system-wide information. What would you like to know?';
    }
    return 'Hello! How can I assist you today?';
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Call your backend proxy instead of Groq directly
      const response = await fetch('https://fahari-production.up.railway.app/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add your authentication header here
          // 'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          userRole: userRole,
          userId: userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not process that.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, there was an error: ${error.message}. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleColor = () => {
    if (userRole === 'ADMIN') return 'from-red-500 to-pink-500';
    if (userRole === 'SALON_OWNER') return 'from-green-500 to-emerald-500';
    return 'from-purple-500 to-blue-500';
  };

  const getRoleTitle = () => {
    if (userRole === 'ADMIN') return 'ADMIN Assistant';
    if (userRole === 'SALON_OWNER') return 'Salon Management Assistant';
    return 'Booking Assistant';
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${getRoleColor()} rounded-full flex items-center justify-center`}>
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{getRoleTitle()}</h1>
            <p className="text-sm text-gray-500">Powered by AI</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        )}
      </div>

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
                : `bg-gradient-to-r ${getRoleColor()}`
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
            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getRoleColor()} flex items-center justify-center`}>
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
            placeholder={
              userRole === 'SALON_OWNER' 
                ? "Ask about appointments, revenue, or slots..." 
                : userRole === 'ADMIN'
                ? "Ask about platform stats, salons, or users..."
                : "Ask about services, availability, or bookings..."
            }
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className={`px-6 py-3 bg-gradient-to-r ${getRoleColor()} text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}