// src/services/notificationService.ts
import { pool } from "../index.js";
import { io } from "../realtime/socket.js";
export async function createAndSendNotification(payload) {
    if (payload.role) {
        // 🔹 Get all users with that role
        const { rows: users } = await pool.query(`SELECT id FROM users WHERE role = $1`, [payload.role]);
        for (const user of users) {
            const { rows } = await pool.query(`INSERT INTO notifications ("userId", type, title, message, data, "isRead")
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`, [
                user.id,
                payload.type ?? "GENERAL",
                payload.title,
                payload.message,
                payload.data ? JSON.stringify(payload.data) : null,
            ]);
            const notif = rows[0];
            io.to(`user:${user.id}`).emit("notification:new", notif);
        }
        return;
    }
    if (payload.userId) {
        // 🔹 Single-user notification
        const { rows } = await pool.query(`INSERT INTO notifications ("userId", type, title, message, data, "isRead")
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`, [
            payload.userId,
            payload.type ?? "GENERAL",
            payload.title,
            payload.message,
            payload.data ? JSON.stringify(payload.data) : null,
        ]);
        const notif = rows[0];
        io.to(`user:${payload.userId}`).emit("notification:new", notif);
        return notif;
    }
    throw new Error("Notification must have either userId or role");
}
