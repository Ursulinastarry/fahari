import cron from "node-cron";
import prisma from "../config/prisma";
import { generateSlotsForDay } from "../utils/slotGenerator";
import { DateTime } from "luxon";
// PRODUCTION CRON - Runs at midnight
cron.schedule(
  "* * * * *", 
  async () => {
    const DAYS_AHEAD = 7; // change this number to generate for a different number of upcoming days
    console.log(`🕘 Running daily slot generator for the next ${DAYS_AHEAD} days (every day at 21:00 Africa/Nairobi)`);
    console.log("⏰ Current time:", DateTime.now().setZone("Africa/Nairobi").toLocaleString(DateTime.DATETIME_MED));

    try {
      const salons = await prisma.salon.findMany();
      console.log(`📍 Found ${salons.length} salons`);

      if (salons.length === 0) {
        console.log("⚠️ No salons found in database");
        return;
      }

      const baseDay = DateTime.now().setZone("Africa/Nairobi").startOf("day");

      for (let offset = 1; offset <= DAYS_AHEAD; offset++) {
        const targetDay = baseDay.plus({ days: offset });
        console.log(`\n🎯 Generating slots for ${targetDay.toISODate()}`);

        for (const salon of salons) {
          try {
            // Luxon weekday: 1=Monday ... 7=Sunday
            const weekdayIndex = targetDay.weekday % 7; // convert to 0=Sunday,1=Monday...
            let openHour = 9,
              closeHour = 17;

            const businessHours = salon.businessHours as any;
            console.log(`🏪 Processing ${salon.name}, business hours:`, businessHours);

            if (businessHours.weekdays && businessHours.weekends) {
              // --- Format 1: compact ---
              if (weekdayIndex >= 1 && weekdayIndex <= 5) {
                [openHour, closeHour] = businessHours.weekdays
                  .split("-")
                  .map((h: string, idx: number) =>
                    idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h)
                  );
              } else {
                [openHour, closeHour] = businessHours.weekends
                  .split("-")
                  .map((h: string, idx: number) =>
                    idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h)
                  );
              }
            } else {
              // --- Format 2: per-day ---
              const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
              const todayKey = dayMap[weekdayIndex];
              const dayConfig = businessHours[todayKey];

              if (!dayConfig || dayConfig.closed) {
                console.log(`🚫 ${salon.name} is closed on ${targetDay.toISODate()}`);
                continue;
              }

              openHour = Number((dayConfig.open as string).split(":")[0]);
              closeHour = Number((dayConfig.close as string).split(":")[0]);
            }

            if (openHour >= closeHour) {
              console.log(`🚫 ${salon.name} is closed on ${targetDay.toISODate()}`);
              continue;
            }

            console.log(`⏰ ${salon.name} hours for ${targetDay.toISODate()}: ${openHour}:00 - ${closeHour}:00`);

            await generateSlotsForDay(salon.id, targetDay.toJSDate(), openHour, closeHour);
            console.log(`✅ Slots generated for ${salon.name} on ${targetDay.toISODate()}`);
          } catch (err) {
            console.error(`❌ Failed to generate slots for ${salon.name} on ${targetDay.toISODate()}:`, err);
          }
        }
        console.log(`🎉 Completed slot generation for ${targetDay.toISODate()}`);
      }
    } catch (err) {
      console.error("❌ Failed to fetch salons:", err);
    }
  },
  { timezone: "Africa/Nairobi" }
);

// Manual trigger function for testing
export const triggerSlotGeneration = async () => {
  console.log(" Manually triggering slot generation...");
  // Copy the same logic from the midnight cron here
};

// console.log("📅 Daily slot generator cron job scheduled for midnight (Africa/Nairobi)");
console.log("⏰ Current time:", new Date().toLocaleString("en-US", {timeZone: "Africa/Nairobi"}));