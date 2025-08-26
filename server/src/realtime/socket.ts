// src/realtime/socket.ts
import { Server } from "socket.io";
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";

type JWTPayload = { id: string; role: "CLIENT" | "SALON_OWNER" | "ADMIN" };

export let io: Server;

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
      if (!token) return next(new Error("Unauthorized"));

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

      // put user identity on socket
      (socket as any).user = { id: payload.id, role: payload.role };

      // join personal room + role room
      socket.join(`user:${payload.id}`);
      socket.join(`role:${payload.role}`);

      return next();
    } catch (e) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // optional: on connect, push unread notifications
    // your API route can also handle this; see below
  });

  return io;
}
