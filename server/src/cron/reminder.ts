// src/cron/reminderCron.ts
import cron from "node-cron";
import prisma from "../config/prisma";
import { getIO } from "../realtime/socket";


  // run every minute
  cron.schedule("* * * * *", async () => {
    console.log("🔔 Running reminder cron job");
    const now = new Date();
const fiveHoursFromNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
const fiveMinutesWindow = new Date(fiveHoursFromNow.getTime() + 5 * 60 * 1000);

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

