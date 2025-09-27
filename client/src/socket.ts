// src/socket.ts
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  withCredentials: true,
  transports: ["websocket"], // force WebSocket
});
socket.on("reminder", (data) => {
  console.log("📢 Reminder:", data);
  alert(data.message); // or toast notification
});

export default socket;
