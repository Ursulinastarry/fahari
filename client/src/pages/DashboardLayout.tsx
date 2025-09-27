// src/components/DashboardLayout.tsx
import React, { ReactNode, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useUser } from "../contexts/UserContext";
import ProfileManager from "./ProfileManager";
interface Props {
  title: string;
  children: ReactNode;
}

const DashboardLayout: React.FC<Props> = ({ title, children }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [salon, setSalon] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<{ type: "user" | "ai"; message: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  let socket: Socket | null = null;

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/users/me", { withCredentials: true });
        setUser(res.data);

        if (res.data.role === "SALON_OWNER") {
          const salonRes = await axios.get("http://localhost:4000/api/salons/owner/me", { withCredentials: true });
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

  // Notifications (poll + socket) - only if user is logged in
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/notifications", { withCredentials: true });
        setNotifications(res.data);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();

    // Real-time socket listener
    socket = io("http://localhost:4000", {
      transports: ["websocket"],   // force WebSocket, skip polling
      withCredentials: true,
    });

    socket.on("notification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket?.disconnect();
    };
  }, [user]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:4000/api/users/logout", {}, { withCredentials: true });
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Handle login redirect
  const handleLogin = () => {
    navigate("/login");
  };

  // Chatbot send
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages([...chatMessages, { type: "user", message: chatInput }]);

    try {
      const res = await axios.post(
        "http://localhost:4000/api/ai/chat",
        { message: chatInput },
        { withCredentials: true }
      );
      setChatMessages((prev) => [...prev, { type: "ai", message: res.data.reply }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { type: "ai", message: "⚠️ AI failed to respond." }]);
    }

    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-purple-600">{title}</h1>
        <div className="flex items-center gap-4">
          {/* Only show notifications icon if user is logged in */}
          {user && (
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-600 hover:text-purple-600"
            >
              🔔
              {notifications.some((n) => !n.isRead) && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
                  {notifications.filter((n) => !n.isRead).length}
                </span>
              )}
            </button>
          )}
          
          {/* Only show profile button if user is logged in */}
          {user && <ProfileManager />}

          
          <button
            onClick={() => setShowChatbot(true)}
            className="text-gray-600 hover:text-purple-600"
          >
            🤖 AI
          </button>
          
          {/* Show Login or Logout button based on user status */}
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

      {/* Notifications Modal */}
      {showNotifications && user && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowNotifications(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 text-purple-600">Notifications</h2>
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications yet</p>
            ) : (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {notifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`p-3 rounded-lg ${notif.isRead ? "bg-gray-50" : "bg-purple-50"}`}
                  >
                    <p className="font-semibold">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col relative">
            <button
              onClick={() => setShowChatbot(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-purple-600">Fahari AI Assistant</h2>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    msg.type === "user" ? "bg-purple-600 text-white self-end" : "bg-gray-100 text-gray-800 self-start"
                  }`}
                >
                  {msg.message}
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="flex border-t">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 p-3 outline-none"
              />
              <button type="submit" className="px-6 bg-purple-600 text-white">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;