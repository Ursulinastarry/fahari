import React, { useEffect, useState } from "react";
import socket from "../socket";
import axios from "axios";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    // initial fetch
    const fetchNotifications = async () => {
      const res = await axios.get("http://localhost:4000/api/notifications", { withCredentials: true });
      setNotifications(res.data);
    };
    fetchNotifications();

    // socket.io listener
    socket.on("newNotification", (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.off("newNotification"); // cleanup on unmount
    };
  }, []);

  return (
        <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h1>
      <div className="space-y-4">
        {notifications.map((n) => (
          <div key={n.id} className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-700">{n.title}</h2>
            <p className="text-gray-500">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
