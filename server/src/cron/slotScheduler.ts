import cron from "node-cron";
import prisma from "../config/prisma";
import { generateSlotsForDay } from "../utils/slotGenerator";
import { DateTime } from "luxon";



// PRODUCTION CRON - Runs at 10am
cron.schedule(
  "10 14 * * *", // 10am daily
  async () => {
    console.log("🕛 Running daily slot generator for day +7...");
    console.log("⏰ Current time:", new Date().toLocaleString("en-US", {timeZone: "Africa/Nairobi"}));
    
    try {
      const salons = await prisma.salon.findMany();
      console.log(`📍 Found ${salons.length} salons`);
      
      if (salons.length === 0) {
        console.log("⚠️ No salons found in database");
        return;
      }
      
      const today = new Date();
      const targetDay = new Date(today.getTime());
      targetDay.setDate(today.getDate() + 7);
      
      console.log(`🎯 Generating slots for ${targetDay.toDateString()}`);
      
      for (const salon of salons) {
  try {
    const weekday = targetDay.getDay(); // 0=Sunday, 1=Monday...
    let openHour = 9, closeHour = 17;

    const businessHours = salon.businessHours as any;
    console.log(`🏪 Processing ${salon.name}, business hours:`, businessHours);

    if (businessHours.weekdays && businessHours.weekends) {
      // --- Format 1: compact ---
      if (weekday >= 1 && weekday <= 5) {
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
      const dayMap = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
      const todayKey = dayMap[weekday];
      const dayConfig = businessHours[todayKey];

      if (!dayConfig || dayConfig.closed) {
        console.log(`🚫 ${salon.name} is closed on ${targetDay.toDateString()}`);
        continue;
      }

      openHour = Number(dayConfig.open.split(":")[0]);
      closeHour = Number(dayConfig.close.split(":")[0]);
    }

    if (openHour >= closeHour) {
      console.log(`🚫 ${salon.name} is closed on ${targetDay.toDateString()}`);
      continue;
    }

    console.log(`⏰ ${salon.name} hours: ${openHour}:00 - ${closeHour}:00`);

    await generateSlotsForDay(salon.id, targetDay, openHour, closeHour);
    console.log(`✅ Slots generated for ${salon.name} on ${targetDay.toDateString()}`);

  } catch (err) {
    console.error(`❌ Failed to generate slots for ${salon.name}:`, err);
  }
}

      
      console.log(`🎉 Completed slot generation for ${targetDay.toDateString()}`);
      
    } catch (err) {
      console.error("❌ Failed to fetch salons:", err);
    }
  },
  { timezone: "Africa/Nairobi" }
);

// Manual trigger function for testing
export const triggerSlotGeneration = async () => {
  console.log("🔧 Manually triggering slot generation...");
  // Copy the same logic from the midnight cron here
};

console.log("📅 Daily slot generator cron job scheduled for 10am (Africa/Nairobi)");
console.log("⏰ Current time:", new Date().toLocaleString("en-US", {timeZone: "Africa/Nairobi"}));