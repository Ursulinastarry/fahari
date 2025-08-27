import cron from "node-cron";
import prisma from "../config/prisma";
import { generateSlotsForDay } from "../utils/slotGenerator";

cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("🕛 Running daily slot generator...");
    try {
      const salons = await prisma.salon.findMany();
      const today = new Date();

      for (const salon of salons) {
        for (let i = 1; i <= 7; i++) {
          const day = new Date(today.getTime());
          day.setDate(today.getDate() + i);

          const weekday = day.getDay();
          let openHour = 9,
            closeHour = 17;

          const businessHours = salon.businessHours as any;
          if (weekday >= 1 && weekday <= 5) {
            [openHour, closeHour] = businessHours.weekdays
              .split("-")
              .map((h: any, idx: number) =>
                idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h)
              );
          } else {
            [openHour, closeHour] = businessHours.weekends
              .split("-")
              .map((h: any, idx: number) =>
                idx === 1 && Number(h) < 12 ? Number(h) + 12 : Number(h)
              );
          }

          try {
            await generateSlotsForDay(salon.id, day, openHour, closeHour);
            console.log(`Slots generated for ${salon.name} on ${day.toDateString()}`);
          } catch (err) {
            console.error(`Failed to generate slots for ${salon.name} on ${day.toDateString()}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch salons:", err);
    }
  },
  { timezone: "Africa/Nairobi" }
);
