
import React, { useState, useEffect } from "react";
import axios from "axios";
import { baseUrl } from "../config/baseUrl";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readingNotifications, setReadingNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/notifications`, { 
        withCredentials: true 
      });
      // console.log("Fetched notifications:", res.data);
      setNotifications(res.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReadClick = async (notification: Notification) => {
    console.log("handleMarkAsReadClick called:", notification.id, "isRead:", notification.isRead);

    if (notification.isRead || readingNotifications.has(notification.id)) {
      console.log("Notification already read or being processed");
      return;
    }

    setReadingNotifications(prev => new Set(prev).add(notification.id));

    try {
      // console.log("Making API call to mark as read...");
      const response = await axios.patch(
        `${baseUrl}/api/notifications/${notification.id}/read`,
        {},
        { withCredentials: true }
      );
      
      // console.log("API response:", response.status);

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

  const getNotificationStyles = (notification: Notification) => {
    const baseStyles = "rounded-lg shadow p-4 transition-all duration-200 hover:shadow-md";
    const isBeingRead = readingNotifications.has(notification.id);

    if (isBeingRead) {
      return `${baseStyles} bg-yellow-50 border-l-4 border-yellow-400`;
    }
    if (notification.isRead) {
      return `${baseStyles} bg-gray-50 dark:bg-gray-900 opacity-75`;
    }
    return `${baseStyles} bg-white dark:bg-gray-900 border-l-4 border-blue-400`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-white hover:text-gray-800 dark:text-white z-10"
        >
          ✕
        </button>
        
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-purple-600">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-lg text-gray-600 dark:text-white">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 dark:text-white text-lg">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                // console.log('Rendering notification:', {
                //   id: notification.id,
                //   title: notification.title,
                //   isRead: notification.isRead,
                //   createdAt: notification.createdAt,
                //   hasCreatedAt: !!notification.createdAt
                // });

                return (
                  <div
                    key={notification.id}
                    className={getNotificationStyles(notification)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold ${notification.isRead ? "text-gray-500 dark:text-white" : "text-gray-700"}`}>
                          {notification.title}
                          {!notification.isRead && (
                            <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
                          )}
                        </h3>
                        <p className={`mt-1 ${notification.isRead ? "text-gray-400 dark:text-white" : "text-gray-600 dark:text-white"}`}>
                          {notification.message}
                        </p>
                        {notification.createdAt && (
                          <p className="text-xs text-gray-400 dark:text-white mt-2">
                            {new Date(notification.createdAt).toLocaleDateString()} at{" "}
                            {new Date(notification.createdAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {readingNotifications.has(notification.id) && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        )}

                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsReadClick(notification)}
                            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors whitespace-nowrap"
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NotificationsModal;