// bookingService.ts
import prisma from '../config/prisma.js';
export const getBookingsData = async (userId, userRole, status, salonId) => {
    const where = {};
    if (status)
        where.status = status;
    if (userRole === "CLIENT") {
        where.clientId = userId;
    }
    else if (userRole === "SALON_OWNER") {
        if (salonId) {
            const salon = await prisma.salon.findFirst({
                where: { id: salonId, ownerId: userId },
            });
            if (!salon)
                throw new Error("Not authorized to view bookings for this salon");
            where.salonId = salonId;
        }
        else {
            const ownedSalons = await prisma.salon.findMany({
                where: { ownerId: userId },
                select: { id: true },
            });
            where.salonId = { in: ownedSalons.map((s) => s.id) };
        }
    }
    else if (userRole === "ADMIN" && salonId) {
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
import { pool } from "../index.js";
export const getMyBookingsService = async (userId) => {
    const { rows } = await pool.query(`
    SELECT 
      b.id, 
      b."bookingNumber", 
      b."totalAmount", 
      b.status,
      b."createdAt", 
      b."updatedAt",
      s.id as "salonId", 
      s.name as "salonName",
      ss.id as "salonServiceId",
      sv.id as "serviceId",
      sv.name as "serviceName",
      u.id as "clientId", 
      u."firstName", 
      u."lastName", 
      u.email, 
      u.phone,
      sl."startTime" as "slotStartTime",
      sl."endTime"   as "slotEndTime"
    FROM bookings b
    JOIN salons s ON b."salonId" = s.id
    JOIN users u ON b."clientId" = u.id
    JOIN slots sl ON b."slotId" = sl.id
    JOIN salon_services ss ON b."salonServiceId" = ss.id
    JOIN services sv ON ss."serviceId" = sv.id
    WHERE u.id = $1
    ORDER BY b."createdAt" DESC
    `, [userId]);
    return rows;
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
