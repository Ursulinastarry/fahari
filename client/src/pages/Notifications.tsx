import React, { useEffect, useState } from "react";
import socket from "../socket";
import axios from "axios";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingNotifications, setReadingNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initial fetch
    const fetchNotifications = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/notifications", { 
          withCredentials: true 
        });
        setNotifications(res.data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();

    // Socket.io listener for new notifications
    socket.on("newNotification", (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => {
      socket.off("newNotification"); // cleanup on unmount
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    console.log("handleNotificationClick called:", notification.id, "isRead:", notification.isRead);
    
    // Don't do anything if already read or currently being processed
    if (notification.isRead || readingNotifications.has(notification.id)) {
      console.log("Notification already read or being processed");
      return;
    }

    console.log("Processing notification:", notification.id);

    // Add to reading set to prevent multiple requests
    setReadingNotifications(prev => new Set(prev).add(notification.id));

    try {
      console.log("Making API call to mark as read...");
      const response = await axios.patch(
        `http://localhost:4000/api/notifications/${notification.id}/read`,
        {},
        { withCredentials: true }
      );
      
      console.log("API response:", response.status);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );

      console.log(`Notification ${notification.id} marked as read successfully`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      alert("Failed to mark notification as read. Please try again.");
    } finally {
      setReadingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  // Helper to style notifications
  const getNotificationStyles = (notification: Notification) => {
    const baseStyles = "rounded-lg shadow p-4 transition-all duration-200 hover:shadow-md";
    const isBeingRead = readingNotifications.has(notification.id);
    const cursorStyle = notification.isRead ? "cursor-default" : "cursor-pointer hover:bg-blue-50";

    if (isBeingRead) {
      return `${baseStyles} ${cursorStyle} bg-yellow-50 border-l-4 border-yellow-400`;
    }
    if (notification.isRead) {
      return `${baseStyles} ${cursorStyle} bg-gray-50 opacity-75`;
    }
    return `${baseStyles} ${cursorStyle} bg-white border-l-4 border-blue-400`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>

        {/* Optional: Mark all as read button */}
        {unreadCount > 0 && (
          <button
            onClick={async () => {
              const unreadNotifications = notifications.filter(n => !n.isRead);
              for (const notification of unreadNotifications) {
                await handleNotificationClick(notification);
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Mark All as Read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Temporary debug button */}
        <button 
          onClick={() => {
            console.log("Test button clicked");
            if (notifications.length > 0) {
              handleNotificationClick(notifications[0]);
            }
          }}
          className="mb-4 px-4 py-2 bg-green-500 text-white rounded"
        >
          Test Click First Notification
        </button>

        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={getNotificationStyles(notification)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("Notification clicked:", notification.id, "isRead:", notification.isRead);
                handleNotificationClick(notification);
              }}
              style={{ userSelect: "none" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className={`font-semibold ${notification.isRead ? "text-gray-500" : "text-gray-700"}`}>
                    {notification.title}
                    {!notification.isRead && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                    )}
                  </h2>
                  <p className={`mt-1 ${notification.isRead ? "text-gray-400" : "text-gray-600"}`}>
                    {notification.message}
                  </p>
                  {notification.createdAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                      {new Date(notification.createdAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {readingNotifications.has(notification.id) && (
                  <div className="ml-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  </div>
                )}
              </div>

              {!notification.isRead && (
                <div className="mt-2 text-xs text-blue-600 font-medium">
                  Click to mark as read
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
