"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
exports.initSocket = initSocket;
exports.getIO = getIO;
// src/realtime/socket.ts
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function initSocket(server) {
    exports.io = new socket_io_1.Server(server, {
        cors: {
            origin: "http://localhost:5173", // 👈 explicit, not "*"
            methods: ["GET", "POST"],
            credentials: true,
        },
        transports: ["websocket"], // force WebSocket, skip polling
    });
    exports.io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
            if (!token)
                return next(new Error("Unauthorized"));
            const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    exports.io.on("connection", (socket) => {
        console.log("✅ Socket connected:", socket.id);
        socket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", socket.id, "reason:", reason);
        });
    });
    return exports.io;
}
// src/realtime/socket.ts
function getIO() {
    if (!exports.io)
        throw new Error("Socket.io not initialized!");
    return exports.io;
}
