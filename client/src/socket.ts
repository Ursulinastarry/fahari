// src/socket.ts
import { io } from "socket.io-client";

const socket = io("https://fahari-j7ac.onrender.com", {
  withCredentials: true,
  transports: ["websocket"], // force WebSocket
});
socket.on("reminder", (data) => {
  console.log("📢 Reminder:", data);
  alert(data.message); // or toast notification
});

export default socket;
