import React, { ReactNode, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import { baseUrl } from "../config/baseUrl";
import { useUser } from "../contexts/UserContext";
import ProfileManager from "./ProfileManager";
import NotificationsModal from "./Notifications";
import ContactUsModal from "./ContactUsPage";
import { Bot, Send, Loader2, User, X, Bell } from "lucide-react";

interface Props {
  title: string;
  children: ReactNode;
  logo?: string;
}
interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  // add any other fields your API returns
}

interface NotificationsModalProps {
  isOpen: boolean;                     // whether the modal is visible
  onClose: () => void;                 // function to close the modal
  notifications: Notification[];       // array of notifications
}

const DashboardLayout: React.FC<Props> = ({ title, logo, children }) => {
  const { user, loading, logout } = useUser();
  const navigate = useNavigate();

  const [salon, setSalon] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showContactUs, setShowContactUs] = useState(false);

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch salon ONLY when user changes
  useEffect(() => {
    if (!user || user.role !== "SALON_OWNER") {
      setSalon(null);
      return;
    }

    axios
      .get(`${baseUrl}/api/salons/owner/me`, { withCredentials: true })
      .then(res => setSalon(res.data))
      .catch(() => setSalon(null));
  }, [user]);

  // Welcome message
  useEffect(() => {
    if (!user) return;
    setMessages([{ role: "assistant", content: getWelcomeMessage(user.role) }]);
  }, [user]);

  // Notifications
  useEffect(() => {
    if (!user) return;

    let socket: Socket | null = null;

    axios
      .get(`${baseUrl}/api/notifications`, { withCredentials: true })
      .then(res => setNotifications(res.data));

    socket = io(baseUrl, { withCredentials: true });

    socket.on("notification", notif =>
      setNotifications(prev => [notif, ...prev])
    );

    return () => {
      socket?.disconnect();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || sending) return;

    const msg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setSending(true);

    try {
      const res = await fetch(`${baseUrl}/api/ai-chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: msg }],
          userRole: user.role,
          userId: user.role === "SALON_OWNER" ? salon?.id : user.id,
        }),
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.choices[0].message.content },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Something broke 😭 Try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen">
      {/* NAVBAR */}
      <nav className="flex justify-between p-4 bg-white">
        <h1 className="font-bold text-pink-600">{title}</h1>

        <div className="flex gap-4 items-center">
  {user && (
    <button
      onClick={() => setShowNotifications(true)}
      className="relative"
    >
      <Bell size={20} />

      {notifications.length > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
          {notifications.length}
        </span>
      )}
    </button>
  )}

  {user && <ProfileManager />}
  {user && <button onClick={() => setShowChatbot(true)}>AI</button>}
  <button onClick={() => setShowContactUs(true)}>Contact</button>

  {user ? (
    <button onClick={handleLogout}>Logout</button>
  ) : (
    <button onClick={() => navigate("/login")}>Login</button>
  )}
</div>

      </nav>

      <main className="p-6">{children}</main>

      {showChatbot && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white w-full max-w-xl h-[70vh] rounded-xl flex flex-col">
            <button onClick={() => setShowChatbot(false)} className="self-end p-2">
              <X />
            </button>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <p key={i}><b>{m.role}:</b> {m.content}</p>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 border p-2"
              />
              <button onClick={sendMessage} disabled={sending}>
                <Send />
              </button>
            </div>
          </div>
        </div>
      )}
      <NotificationsModal
  isOpen={showNotifications}
  onClose={() => setShowNotifications(false)}
/>

      <ContactUsModal isOpen={showContactUs} onClose={() => setShowContactUs(false)} />
    </div>
  );
};

export default DashboardLayout;

function getWelcomeMessage(role: string) {
  if (role === "ADMIN") return "Admin mode unlocked 😎";
  if (role === "SALON_OWNER") return "Let’s run your salon like a boss 💅🏽";
  return "Ready to book something cute?";
}
