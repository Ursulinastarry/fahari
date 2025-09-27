"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderCron = void 0;
// src/cron/reminderCron.ts
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("../config/prisma"));
const socket_1 = require("../realtime/socket");
const startReminderCron = () => {
    // run every minute
    node_cron_1.default.schedule("* * * * *", async () => {
        // console.log("🔔 Running reminder cron job");
        const now = new Date();
        const fiveHoursLater = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        const bookings = await prisma_1.default.booking.findMany({
            where: {
                slot: {
                    startTime: {
                        gte: fiveHoursLater,
                        lt: new Date(fiveHoursLater.getTime() + 60 * 1000), // 1-minute window
                    },
                },
            },
            include: { slot: true },
        });
        const io = (0, socket_1.getIO)();
        for (const booking of bookings) {
            io.to(`user:${booking.clientId}`).emit("reminder", {
                type: "APPOINTMENT_REMINDER",
                bookingId: booking.id,
                message: `Reminder: Your appointment starts at ${booking.slot.startTime.toLocaleString()}`,
            });
        }
    });
};
exports.startReminderCron = startReminderCron;
