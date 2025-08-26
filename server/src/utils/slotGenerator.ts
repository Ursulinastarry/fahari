import prisma  from "../config/prisma";

export async function generateSlotsForDay(salonId: string, date: Date, openHour: number, closeHour: number) {
  const slots = [];

  for (let hour = openHour; hour < closeHour; hour++) {
    slots.push({
      salonId,
      date,
      startTime: `${hour}:00`,
      endTime: `${hour + 1}:00`,
      isAvailable: true,
    });
  }

  // Bulk insert (skip duplicates if they exist)
  await prisma.slot.createMany({
    data: slots,
    skipDuplicates: true,
  });

  console.log(`✅ Slots generated for salon ${salonId} on ${date.toDateString()}`);
}
