import cron from "node-cron";
import prisma from "../config/prisma";
import { generateSlotsForDay } from "../utils/slotGenerator";
import { DateTime } from "luxon";



// PRODUCTION CRON - Runs at midnight
// cron.schedule(
//   "0 0 * * *", // midnight daily
//   async () => {
//     console.log("🕛 Running daily slot generator for day +7...");
//     console.log("⏰ Current time:", new Date().toLocaleString("en-US", {timeZone: "Africa/Nairobi"}));
    
//     try {
//       const salons = await prisma.salon.findMany();
//       console.log(`📍 Found ${salons.length} salons`);
      
//       if (salons.length === 0) {
//         console.log("⚠️ No salons found in database");
//         return;
//       }
      
//       const today = new Date();
//       const targetDay = new Date(today.getTime());
//       targetDay.setDate(today.getDate() + 7);
      
//       console.log(`🎯 Generating slots for ${targetDay.toDateString()}`);
      
//       for (const salon of salons) {
//   try {
//     const weekday = targetDay.getDay(); // 0=Sunday, 1=Monday...
//     let openHour = 9, closeHour = 17;

//     const businessHours = salon.businessHours as any;
//     console.log(`🏪 Processing ${salon.name}, business hours:`, businessHours);

//     if (businessHours.weekdays && businessHours.weekends) {
//       // --- Format 1: compact ---
//       if (weekday >= 1 && weekday <= 5) {
//         [openHour, closeHour] = businessHours.weekdays
//           .split("-")
//           .map((h: string, idx: number) =>
//             idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h)
//           );
//       } else {
//         [openHour, closeHour] = businessHours.weekends
//           .split("-")
//           .map((h: string, idx: number) =>
//             idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h)
//           );
//       }

//     } else {
//       // --- Format 2: per-day ---
//       const dayMap = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
//       const todayKey = dayMap[weekday];
//       const dayConfig = businessHours[todayKey];

//       if (!dayConfig || dayConfig.closed) {
//         console.log(`🚫 ${salon.name} is closed on ${targetDay.toDateString()}`);
//         continue;
//       }

//       openHour = Number(dayConfig.open.split(":")[0]);
//       closeHour = Number(dayConfig.close.split(":")[0]);
//     }

//     if (openHour >= closeHour) {
//       console.log(`🚫 ${salon.name} is closed on ${targetDay.toDateString()}`);
//       continue;
//     }

//     console.log(`⏰ ${salon.name} hours: ${openHour}:00 - ${closeHour}:00`);

//     await generateSlotsForDay(salon.id, targetDay, openHour, closeHour);
//     console.log(`✅ Slots generated for ${salon.name} on ${targetDay.toDateString()}`);

//   } catch (err) {
//     console.error(`❌ Failed to generate slots for ${salon.name}:`, err);
//   }
// }

      
//       console.log(`🎉 Completed slot generation for ${targetDay.toDateString()}`);
      
//     } catch (err) {
//       console.error("❌ Failed to fetch salons:", err);
//     }
//   },
//   { timezone: "Africa/Nairobi" }
// );
cron.schedule(
  "30 20 * * *", // 8:30 PM daily
  async () => {
    console.log("🕣 Running 7-day slot generator…");
    console.log(
      "⏰ Current time:",
      new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" })
    );

    try {
      const salons = await prisma.salon.findMany();
      console.log(`📍 Found ${salons.length} salons`);

      if (salons.length === 0) {
        console.log("⚠️ No salons found in database");
        return;
      }

      const today = new Date();

      // Generate for the next 7 days (tomorrow -> +7)
      for (let offset = 1; offset <= 7; offset++) {
        const targetDay = new Date(today.getTime());
        targetDay.setDate(today.getDate() + offset);

        console.log(`🎯 Generating slots for ${targetDay.toDateString()}`);

        for (const salon of salons) {
          try {
            // 👉 Check if slots already exist for this salon & day
            const alreadyHasSlots = await slotsExistForDay(salon.id, targetDay);
            if (alreadyHasSlots) {
              console.log(
                `ℹ️ Slots already exist for ${salon.name} on ${targetDay.toDateString()}, skipping…`
              );
              continue;
            }

            const weekday = targetDay.getDay(); // 0=Sunday, 1=Monday...
            let openHour = 9,
              closeHour = 17;

            const businessHours = salon.businessHours as any;
            console.log(
              `🏪 Processing ${salon.name}, business hours:`,
              businessHours
            );

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
              const dayMap = [
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
              ];
              const todayKey = dayMap[weekday];
              const dayConfig = businessHours[todayKey];

              if (!dayConfig || dayConfig.closed) {
                console.log(
                  `🚫 ${salon.name} is closed on ${targetDay.toDateString()}`
                );
                continue;
              }

              openHour = Number(dayConfig.open.split(":")[0]);
              closeHour = Number(dayConfig.close.split(":")[0]);
            }

            if (openHour >= closeHour) {
              console.log(
                `🚫 ${salon.name} is closed on ${targetDay.toDateString()}`
              );
              continue;
            }

            console.log(
              `⏰ ${salon.name} hours on ${targetDay.toDateString()}: ${openHour}:00 - ${closeHour}:00`
            );

            await generateSlotsForDay(salon.id, targetDay, openHour, closeHour);
            console.log(
              `✅ Slots generated for ${salon.name} on ${targetDay.toDateString()}`
            );
          } catch (err) {
            console.error(
              `❌ Failed to generate slots for ${salon.name} on ${targetDay.toDateString()}:`,
              err
            );
          }
        }

        console.log(
          `🎉 Completed slot generation cycle for ${targetDay.toDateString()}`
        );
      }
    } catch (err) {
      console.error("❌ Failed to fetch salons:", err);
    }
  },
  { timezone: "Africa/Nairobi" }
);

/**
 * Helper: check if slots already exist for a salon on a given day.
 * 🔧 Adjust model/field names to match your schema.
 */
async function slotsExistForDay(salonId: string, targetDay: Date): Promise<boolean> {
  // Normalize to start/end of day
  const startOfDay = new Date(targetDay);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDay);
  endOfDay.setHours(23, 59, 59, 999);

  // ⚠️ Example using a hypothetical `slot` model with `salonId` and `startTime`
  const count = await prisma.slot.count({
    where: {
      salonId,
      startTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  return count > 0;
}

// Manual trigger function for testing
export const triggerSlotGeneration = async () => {
  console.log(" Manually triggering slot generation...");
  // Copy the same logic from the midnight cron here
};

console.log("📅 Daily slot generator cron job scheduled for midnight (Africa/Nairobi)");
console.log("⏰ Current time:", new Date().toLocaleString("en-US", {timeZone: "Africa/Nairobi"}));