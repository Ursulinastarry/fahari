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
export const getSalonsService = async (query) => {
    const { city, location, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = {};
    if (city)
        where.city = city;
    if (location)
        where.location = { contains: location, mode: "insensitive" };
    const salons = await prisma.salon.findMany({
        where,
        include: {
            owner: { select: { firstName: true, lastName: true } },
            salonServices: { include: { service: true } },
            reviews: { take: 5, orderBy: { createdAt: "desc" } },
        },
        skip,
        take: Number(limit),
        orderBy: { averageRating: "desc" },
    });
    const total = await prisma.salon.count({ where });
    return {
        salons,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / Number(limit)),
        },
    };
};
export const getSalonServicesService = async (salonId) => {
    if (!salonId)
        throw new Error("Salon ID is required");
    const salon = await prisma.salon.findUnique({
        where: { id: salonId },
        include: { salonServices: { include: { service: true } } },
    });
    if (!salon)
        throw new Error("Salon not found");
    return salon.salonServices;
};
export const getSlotsService = async (query) => {
    const { salonId, date, serviceId, isAvailable } = query;
    console.log("salonId", salonId);
    const where = {};
    if (salonId)
        where.salonId = salonId;
    if (date)
        where.date = new Date(date);
    if (serviceId)
        where.serviceId = serviceId;
    if (isAvailable !== undefined)
        where.isAvailable = Boolean(isAvailable);
    const slots = await prisma.slot.findMany({
        where,
        include: {
            salon: { select: { name: true } },
            service: { select: { name: true, category: true } },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return slots;
};
export const getAllServicesService = async () => {
    return prisma.salonService.findMany({
        include: { service: true, salon: true }
    });
};
export const getOwnerBookingsService = async (userId) => {
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
    WHERE s."ownerId" = $1
    ORDER BY b."createdAt" DESC
    `, [userId]);
    return rows;
};
/**
 * Get all services for salons owned by the user
 */
export const getOwnerServicesService = async (userId) => {
    const salons = await prisma.salon.findMany({
        where: { ownerId: userId },
        include: {
            salonServices: {
                include: { service: true },
            },
        },
    });
    // Flatten and normalize the services
    const services = salons.flatMap((salon) => salon.salonServices.map((ss) => ({
        id: ss.id,
        price: ss.price,
        duration: ss.duration,
        service: {
            id: ss.service.id,
            name: ss.service.name,
            active: ss.service.isActive,
        },
    })));
    return services;
};
/**
 * Get all slots for salons owned by the user
 */
export const getSalonSlotsService = async (salonId) => {
    const slots = await prisma.slot.findMany({
        where: { salonId },
        orderBy: { startTime: "asc" },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
            serviceId: true,
        },
    });
    return slots;
};
/**
 * Get salons owned by the user
 */
export const getOwnerSalonsService = async (userId) => {
    const salons = await prisma.salon.findMany({
        where: { ownerId: userId },
        include: {
            owner: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            salonServices: {
                include: { service: true },
            },
            reviews: {
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                },
            },
        },
    });
    // Calculate average ratings and return properly typed data
    return salons.map((salon) => ({
        id: salon.id,
        name: salon.name,
        city: salon.city,
        location: salon.location,
        owner: salon.owner,
        salonServices: salon.salonServices,
        reviews: salon.reviews,
        averageRating: salon.reviews.length > 0
            ? salon.reviews.reduce((sum, r) => sum + r.rating, 0) / salon.reviews.length
            : 0,
    }));
};
// ===== ADMIN SERVICES =====
/**
 * Get all users (admin only)
 */
export const getAllUsersService = async () => {
    const { rows } = await pool.query(`SELECT * FROM users`);
    return rows;
};
/**
 * Get all bookings across platform (admin only)
 */
export const getAllBookingsService = async () => {
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
    ORDER BY b."createdAt" DESC
    `);
    return rows;
};
/**
 * Get all salons (admin only)
 */
export const getAllSalonsService = async () => {
    const salons = await prisma.salon.findMany({
        include: {
            owner: {
                select: {
                    firstName: true,
                    lastName: true,
                },
            },
            salonServices: {
                include: { service: true },
            },
            reviews: {
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    createdAt: true,
                },
            },
        },
    });
    // Calculate average ratings and return properly typed data
    return salons.map((salon) => ({
        id: salon.id,
        name: salon.name,
        city: salon.city,
        location: salon.location,
        owner: salon.owner,
        salonServices: salon.salonServices,
        reviews: salon.reviews,
        averageRating: salon.reviews.length > 0
            ? salon.reviews.reduce((sum, r) => sum + r.rating, 0) / salon.reviews.length
            : 0,
    }));
};
