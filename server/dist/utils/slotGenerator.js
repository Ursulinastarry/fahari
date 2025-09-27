import prisma from "../config/prisma";
import { DateTime } from "luxon";
export async function generateSlotsForDay(salonId, date, openHour, closeHour) {
    const slots = [];
    const day = DateTime.fromJSDate(date).setZone("Africa/Nairobi").startOf("day");
    for (let hour = openHour; hour < closeHour; hour++) {
        const start = day.plus({ hours: hour }).toJSDate();
        const end = day.plus({ hours: hour + 1 }).toJSDate();
        slots.push({
            salonId,
            date: start, // you can store start of day here if needed
            startTime: start,
            endTime: end,
            isAvailable: true,
        });
    }
    await prisma.slot.createMany({
        data: slots,
        skipDuplicates: true,
    });
    console.log(`✅ Slots generated for salon ${salonId} on ${day.toISODate()}`);
}
