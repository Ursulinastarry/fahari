// src/components/DashboardLayout.tsx
import React, { ReactNode, useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import ProfileManager from "./ProfileManager";
import NotificationsModal from "./Notifications";
import ContactUsModal from "./ContactUsPage";
import { Send, Bot, User, Loader2, X } from 'lucide-react';

interface Props {
  title: string;
  children: ReactNode;
  logo?: string;
}

const DashboardLayout: React.FC<Props> = ({ title,logo, children }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);
  
  // AI Chat states
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();
  let socket: Socket | null = null;

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("https://fahari-production.up.railway.app/api/users/me", { withCredentials: true });
        setUser(res.data);

        if (res.data.role === "SALON_OWNER") {
          const salonRes = await axios.get("https://fahari-production.up.railway.app/api/salons/owner/me", { withCredentials: true });
          setSalon(salonRes.data);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Initialize welcome message when user is loaded
  useEffect(() => {
    if (user) {
      setMessages([
        {
          role: 'assistant',
          content: getWelcomeMessage(user.role)
        }
      ]);
    }
  }, [user]);

  // Notifications (poll + socket) - only if user is logged in
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get("https://fahari-production.up.railway.app/api/notifications", { withCredentials: true });
        setNotifications(res.data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    socket = io("https://fahari-production.up.railway.app", {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket?.disconnect();
    };
  }, [user]);

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
      return 'Hello Admin! I can provide platform analytics, salon performance data, user statistics, and any system-wide information. What would you like to know?';
    }
    return 'Hello! How can I assist you today?';
  }

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('https://fahari-production.up.railway.app/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for sending cookies
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          userRole: user.role, // Use the logged-in user's role
          userId: user.role === 'SALON_OWNER' ? salon?.id : user.id // Use salon ID for owners, user ID for others
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
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
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleColor = () => {
    if (!user) return 'from-purple-500 to-blue-500';
    if (user.role === 'ADMIN') return 'from-red-500 to-pink-500';
    if (user.role === 'SALON_OWNER') return 'from-green-500 to-emerald-500';
    return 'from-purple-500 to-blue-500';
  };

  const getRoleTitle = () => {
    if (!user) return 'Booking Assistant';
    if (user.role === 'ADMIN') return 'Admin Assistant';
    if (user.role === 'SALON_OWNER') return 'Salon Management Assistant';
    return 'Booking Assistant';
  };

  const handleLogout = async () => {
    try {
      await axios.post("https://fahari-production.up.railway.app/api/users/logout", {}, { withCredentials: true });
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleCloseChatbot = () => {
    setShowChatbot(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
<h1 className="flex items-center gap-2 text-xl font-bold text-purple-600">
  {logo && <img src={logo} alt="logo" className="h-8 w-auto" />}
  <span>{title}</span>
</h1>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <button
                onClick={() => setShowNotifications(true)}
                className="relative text-gray-600 hover:text-purple-600"
              >
                🔔
              </button>
              <NotificationsModal 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </>
          )}
         
          {user && <ProfileManager />}
           {user &&(
          <button
            onClick={() => setShowChatbot(true)}
            className="text-gray-600 hover:text-purple-600"
          >
            AI Assistant
          </button>
           )}
          <button
            onClick={() => setShowContactUs(true)}
            className="text-gray-600 hover:text-purple-600"
          >
            Contact us
          </button>
          
          {!isLoading && (
            user ? (
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="text-gray-600 hover:text-purple-600"
              >
                Login
              </button>
            )
          )}
        </div>
      </nav>

      {/* Page Content */}
      <main className="p-8">{children}</main>

      {/* Profile Modal */}
      {showProfile && user && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg relative">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <div>
              <h2 className="text-2xl font-bold mb-4 text-purple-600">Profile</h2>
              <p><span className="font-semibold">Name:</span> {user.firstName} {user.lastName}</p>
              <p><span className="font-semibold">Email:</span> {user.email}</p>
              <p><span className="font-semibold">Phone:</span> {user.phone}</p>
              <p><span className="font-semibold">Role:</span> {user.role}</p>
              <p><span className="font-semibold">Status:</span> {user.isActive ? "Active ✅" : "Inactive ❌"}</p>

              {salon && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-xl font-bold mb-2 text-indigo-600">Salon Info</h3>
                  <p><span className="font-semibold">Name:</span> {salon.name}</p>
                  <p><span className="font-semibold">City:</span> {salon.city}</p>
                  <p><span className="font-semibold">Location:</span> {salon.location}</p>
                  <p><span className="font-semibold">Phone:</span> {salon.phone}</p>
                  <p><span className="font-semibold">Rating:</span> ⭐ {salon.averageRating}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot Modal */}
      {showChatbot && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col relative">
            <button
              onClick={handleCloseChatbot}
              className="absolute top-4 right-4 z-10 text-gray-500 hover:text-gray-800"
            >
              <X size={24} />
            </button>
            
            <div className="flex flex-col h-full bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-white shadow-md p-4 flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${getRoleColor()} rounded-full flex items-center justify-center`}>
                  <Bot className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{getRoleTitle()}</h1>
                  <p className="text-sm text-gray-500">Powered by AI</p>
                </div>
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
                
                {loading && (
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      user?.role === 'SALON_OWNER' 
                        ? "Ask about appointments, revenue, or slots..." 
                        : user?.role === 'ADMIN'
                        ? "Ask about platform stats, salons, or users..."
                        : "Ask about services, availability, or bookings..."
                    }
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                    disabled={loading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className={`px-6 py-3 bg-gradient-to-r ${getRoleColor()} text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ContactUsModal 
        isOpen={showContactUs}
        onClose={() => setShowContactUs(false)}
      />
    </div>
  );
};

export default DashboardLayout;