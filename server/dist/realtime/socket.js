// src/realtime/socket.ts
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
export let io;
export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: ["https://faharibeauty.com", "http://localhost:5173", "http://localhost:3000"],
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["polling", "websocket"], // allow polling and websocket
    });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
            if (!token)
                return next(new Error("Unauthorized"));
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            // put user identity on socket
            socket.user = { id: payload.id, role: payload.role };
            // join personal room + role room
            socket.join(`user:${payload.id}`);
            socket.join(`role:${payload.role}`);
            return next();
        }
        catch (e) {
            return next(new Error("Unauthorized"));
        }
    });
    io.on("connection", (socket) => {
        console.log("✅ Socket connected:", socket.id);
        socket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", socket.id, "reason:", reason);
        });
    });
    return io;
}
// src/realtime/socket.ts
export function getIO() {
    if (!io)
        throw new Error("Socket.io not initialized!");
    return io;
}
