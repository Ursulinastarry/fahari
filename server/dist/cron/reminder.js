// src/cron/reminderCron.ts
import cron from "node-cron";
import prisma from "../config/prisma";
import { getIO } from "../realtime/socket";
export const startReminderCron = () => {
    // run every minute
    cron.schedule("* * * * *", async () => {
        // console.log("🔔 Running reminder cron job");
        const now = new Date();
        const fiveHoursLater = new Date(now.getTime() + 5 * 60 * 60 * 1000);
        const bookings = await prisma.booking.findMany({
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
        const io = getIO();
        for (const booking of bookings) {
            io.to(`user:${booking.clientId}`).emit("reminder", {
                type: "APPOINTMENT_REMINDER",
                bookingId: booking.id,
                message: `Reminder: Your appointment starts at ${booking.slot.startTime.toLocaleString()}`,
            });
        }
    });
};
