"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndSendNotification = createAndSendNotification;
// src/services/notificationService.ts
const index_1 = require("../index");
const socket_1 = require("../realtime/socket");
async function createAndSendNotification(payload) {
    if (payload.role) {
        // 🔹 Get all users with that role
        const { rows: users } = await index_1.pool.query(`SELECT id FROM users WHERE role = $1`, [payload.role]);
        for (const user of users) {
            const { rows } = await index_1.pool.query(`INSERT INTO notifications ("userId", type, title, message, data, "isRead")
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`, [
                user.id,
                payload.type ?? "GENERAL",
                payload.title,
                payload.message,
                payload.data ? JSON.stringify(payload.data) : null,
            ]);
            const notif = rows[0];
            socket_1.io.to(`user:${user.id}`).emit("notification:new", notif);
        }
        return;
    }
    if (payload.userId) {
        // 🔹 Single-user notification
        const { rows } = await index_1.pool.query(`INSERT INTO notifications ("userId", type, title, message, data, "isRead")
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`, [
            payload.userId,
            payload.type ?? "GENERAL",
            payload.title,
            payload.message,
            payload.data ? JSON.stringify(payload.data) : null,
        ]);
        const notif = rows[0];
        socket_1.io.to(`user:${payload.userId}`).emit("notification:new", notif);
        return notif;
    }
    throw new Error("Notification must have either userId or role");
}
