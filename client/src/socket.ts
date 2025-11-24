// src/socket.ts
import { io } from "socket.io-client";
import { baseUrl } from "./config/baseUrl";

const socket = io(baseUrl, {
  withCredentials: true,
  transports: ["websocket"], // force WebSocket
});
socket.on("reminder", (data) => {
  console.log("📢 Reminder:", data);
  alert(data.message); // or toast notification
});

export default socket;
