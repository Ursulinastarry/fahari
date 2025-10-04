// src/cron/reminderCron.ts
import cron from "node-cron";
import prisma from "../config/prisma.js";
import { getIO } from "../realtime/socket.js";
// run every minute
cron.schedule("* * * * *", async () => {
    console.log("🔔 Running reminder cron job");
    // Force time calculations in Nairobi timezone
    const now = new Date();
    // Convert to Nairobi time manually
    const formatter = new Intl.DateTimeFormat("en-KE", {
        timeZone: "Africa/Nairobi",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
    const nairobiNowString = formatter.format(now);
    const nairobiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const fiveHoursFromNow = new Date(nairobiNow.getTime() + 5 * 60 * 60 * 1000);
    const fiveMinutesWindow = new Date(fiveHoursFromNow.getTime() + 5 * 60 * 1000);
    console.log("Nairobi now:", nairobiNow.toString());
    console.log("Five hours from now:", fiveHoursFromNow.toString());
    console.log("Five minutes after that:", fiveMinutesWindow.toString());
    const bookings = await prisma.booking.findMany({
        where: {
            slot: {
                startTime: {
                    gte: fiveHoursFromNow,
                    lt: fiveMinutesWindow, // 5-minute window instead of 1
                },
            },
            status: "CONFIRMED", // Add status check
        },
        include: {
            slot: true,
            client: true, // Include client for debugging
        },
    });
    console.log(`🔍 Found ${bookings.length} bookings to remind`);
    const io = getIO();
    for (const booking of bookings) {
        io.to(`user:${booking.clientId}`).emit("reminder", {
            type: "APPOINTMENT_REMINDER",
            bookingId: booking.id,
            message: `Reminder: Your appointment starts at ${booking.slot.startTime.toLocaleString()}`,
        });
    }
});
