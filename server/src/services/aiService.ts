// bookingService.ts
import prisma from '../config/prisma';
export const getBookingsData = async (userId: string, userRole: string, status?: string, salonId?: string) => {
  const where: any = {};
  if (status) where.status = status;

  if (userRole === "CLIENT") {
    where.clientId = userId;
  } else if (userRole === "SALON_OWNER") {
    if (salonId) {
      const salon = await prisma.salon.findFirst({
        where: { id: salonId, ownerId: userId },
      });
      if (!salon) throw new Error("Not authorized to view bookings for this salon");
      where.salonId = salonId;
    } else {
      const ownedSalons = await prisma.salon.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      where.salonId = { in: ownedSalons.map((s) => s.id) };
    }
  } else if (userRole === "ADMIN" && salonId) {
    where.salonId = salonId;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      client: { select: { firstName: true, lastName: true, phone: true } },
      salon: { select: { name: true } },
      salonService: { select: { service: { select: { name: true, category: true } } } },
      appointment: true,
      payment: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings;
};
export const fetchAllSalons = async () => {
  return await prisma.salon.findMany(); // Prisma, Sequelize, or whatever DB client
};
export const fetchAllSalonServices = async () => {
  return await prisma.salonService.findMany(); // Prisma, Sequelize, or whatever DB client
};
export const fetchAllSlots = async () => {
  return await prisma.slot.findMany(); // Prisma, Sequelize, or whatever DB client
};
