// src/socket.ts
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  withCredentials: true,
  transports: ["websocket"], // force WebSocket
});

export default socket;
