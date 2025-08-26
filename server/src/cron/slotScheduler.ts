import cron from "node-cron";
import  prisma  from "../config/prisma";
import { generateSlotsForDay } from "../utils/slotGenerator";

cron.schedule("0 0 * * *", async () => {
  console.log("🕛 Running daily slot generator...");

  const salons = await prisma.salon.findMany();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  for (const salon of salons) {
  for (let i = 1; i <= 7; i++) {   // next 7 days
    const day = new Date();
    day.setDate(today.getDate() + i);

    const weekday = day.getDay();
    let openHour = 9, closeHour = 17;

    const businessHours = salon.businessHours as any;
    if (weekday >= 1 && weekday <= 5) {
      [openHour, closeHour] = businessHours.weekdays.split("-").map(Number);
    } else {
      [openHour, closeHour] = businessHours.weekends.split("-").map(Number);
    }

    await generateSlotsForDay(salon.id, day, openHour, closeHour);
  }
}

});
