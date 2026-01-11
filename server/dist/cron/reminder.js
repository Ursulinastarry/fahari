// src/cron/reminderCron.ts
import cron from "node-cron";
import prisma from "../config/prisma.js";
import { createAndSendNotification } from "../services/notificationService.js";
// Run every minute
cron.schedule("* * * * *", async () => {
    // console.log("🔔 Running reminder cron job");
    try {
        // Get current Nairobi time
        const nairobiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
        const fiveHoursFromNow = new Date(nairobiNow.getTime() + 5 * 60 * 60 * 1000);
        const oneMinuteWindow = new Date(fiveHoursFromNow.getTime() + 1 * 60 * 1000);
        // console.log("Nairobi now:", nairobiNow.toISOString());
        // console.log("Five hours from now:", fiveHoursFromNow.toISOString());
        // console.log("One minute after that:", oneMinuteWindow.toISOString());
        const bookings = await prisma.booking.findMany({
            where: {
                slot: {
                    startTime: {
                        gte: fiveHoursFromNow,
                        lt: oneMinuteWindow, // 1-minute window
                    },
                },
                status: "CONFIRMED",
            },
            include: {
                slot: true,
                client: true,
                salonService: {
                    include: {
                        service: true,
                    },
                },
                salon: true,
            },
        });
        // console.log(`🔍 Found ${bookings.length} bookings to remind`);
        // Send notification for each booking
        for (const booking of bookings) {
            await createAndSendNotification({
                userId: booking.client.id,
                title: "Don't forget your appointment!",
                message: `Your booking for ${booking.salonService?.service?.name || "service"} at ${booking.salon?.name || "salon"} is coming up in 8 hours.`,
                type: "BOOKING_REMINDER",
                data: { bookingId: booking.id },
                sendEmail: true,
                emailTo: booking.client.email,
                sendPush: true,
            });
            console.log(`✅ Sent reminder to ${booking.client.email} for booking ${booking.id}`);
        }
    }
    catch (error) {
        console.error("❌ Error in reminder cron job:", error);
    }
});
