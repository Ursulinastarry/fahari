"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBooking = exports.updateBooking = exports.getMyBookings = exports.getOwnerBookings = exports.getBookings = exports.createBooking = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const index_1 = require("../index");
const prisma_1 = __importDefault(require("../config/prisma"));
const luxon_1 = require("luxon");
exports.createBooking = (0, asyncHandler_1.default)(async (req, res) => {
    const { salonId, salonServiceId, slotDate, slotStartTime } = req.body;
    // slotDate = "2025-08-28", slotStartTime = "06:00"
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    // Fetch the salon service directly
    const salonService = await prisma_1.default.salonService.findUnique({
        where: { id: salonServiceId },
    });
    if (!salonService)
        return res.status(404).json({ error: "SalonService not found" });
    const slotDuration = 60; // each slot = 60 mins
    const requiredSlots = Math.ceil(salonService.duration / slotDuration);
    // Combine date + time into a proper Date object in UTC
    console.log("slotDate:", slotDate, "slotStartTime:", slotStartTime);
    const startSlot = luxon_1.DateTime.fromISO(`${slotDate}T${slotStartTime}`, { zone: 'Africa/Nairobi' }).toJSDate();
    const slots = await prisma_1.default.slot.findMany({
        where: {
            salonId,
            startTime: { gte: startSlot },
            isAvailable: true
        },
        orderBy: { startTime: 'asc' },
        take: 1
    });
    if (slots.length < requiredSlots) {
        return res.status(400).json({ error: "Not enough consecutive slots available" });
    }
    // Mark slots as booked
    const slotIds = slots.map((s) => s.id);
    await prisma_1.default.slot.updateMany({
        where: { id: { in: slotIds } },
        data: { isAvailable: false },
    });
    // Create an appointment for the booked time (represents merged slot)
    const appointment = await prisma_1.default.appointment.create({
        data: {
            date: slots[0].date,
            startTime: slots[0].startTime,
            endTime: slots[slots.length - 1].endTime,
            salonId,
            salonServiceId, // Use SalonService ID
            slotId: slotIds[0], // store first slot as representative
            status: "CONFIRMED",
        },
    });
    // Create the booking linked to appointment, salonService, slot, and client
    const booking = await prisma_1.default.booking.create({
        data: {
            bookingNumber: `BK-${Date.now()}`,
            totalAmount: salonService.price,
            status: "CONFIRMED",
            clientId: req.user.id,
            salonId,
            salonServiceId,
            appointmentId: appointment.id,
            slotId: slotIds[0], // first slot
        },
    });
    res.status(201).json({ booking, bookedSlots: slotIds, appointment });
});
exports.getBookings = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { status, salonId } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;
        const where = {};
        if (status)
            where.status = status;
        // Filter based on user role
        if (userRole === 'CLIENT') {
            where.clientId = userId;
        }
        else if (userRole === 'SALON_OWNER') {
            if (salonId) {
                // Verify salon ownership
                const salon = await prisma_1.default.salon.findFirst({
                    where: { id: salonId, ownerId: userId }
                });
                if (!salon) {
                    return res.status(403).json({ message: 'Not authorized to view bookings for this salon' });
                }
                where.salonId = salonId;
            }
            else {
                // Get all bookings for owned salons
                const ownedSalons = await prisma_1.default.salon.findMany({
                    where: { ownerId: userId },
                    select: { id: true }
                });
                where.salonId = { in: ownedSalons.map((s) => s.id) };
            }
        }
        else if (userRole === 'ADMIN' && salonId) {
            where.salonId = salonId;
        }
        const bookings = await prisma_1.default.booking.findMany({
            where,
            include: {
                client: { select: { firstName: true, lastName: true, phone: true } },
                salon: { select: { name: true } },
                salonService: { select: { service: { select: { name: true, category: true } } } },
                appointment: true,
                payment: true,
                review: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(bookings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// export const getBooking = asyncHandler(async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const userId = (req as any).user.userId;
//     const userRole = (req as any).user.role;
//     const booking = await prisma.booking.findUnique({
//       where: { id },
//       include: {
//         client: { select: { firstName: true, lastName: true, phone: true } },
//         salon: { 
//           select: { name: true, ownerId: true }
//         },
//         salonService: { select: { service: { select: { name: true, category: true } } } },
//         appointment: true,
//         payment: true,
//         review: true
//       }
//     });
//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }
//     // Check authorization
//     const isOwner = booking.clientId === userId;
//     const isSalonOwner = booking.salon.ownerId === userId;
//     const isAdmin = userRole === 'ADMIN';
//     if (!isOwner && !isSalonOwner && !isAdmin) {
//       return res.status(403).json({ message: 'Not authorized to view this booking' });
//     }
//     res.json(booking);
//   } catch (error: any) {
//     res.status(500).json({ message: error.message });
//   }
// });
exports.getOwnerBookings = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const ownerId = req.user.id;
    // Only SALON_OWNER or ADMIN should be allowed
    if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only salon owners or admins can view bookings" });
    }
    // Query all bookings for salons owned by this user
    const { rows } = await index_1.pool.query(`
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
  `, [ownerId]);
    res.json(rows);
});
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const { rows: bookingArray } = await index_1.pool.query(`
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
        res.json(bookingArray);
    }
    catch (err) {
        console.error("Error fetching bookings:", err);
        res.status(500).json({ error: err instanceof Error ? err.message : err });
    }
};
exports.getMyBookings = getMyBookings;
exports.updateBooking = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const { status, salonNotes } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const booking = await prisma_1.default.booking.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        // Only salon owner can update booking status and add salon notes
        const canReschedule = booking.clientId === userId ||
            booking.salon.ownerId === userId ||
            userRole === 'ADMIN';
        if (!canReschedule) {
            return res.status(403).json({ message: 'Not authorized to reschedule this booking' });
        }
        const updatedBooking = await prisma_1.default.booking.update({
            where: { id },
            data: { status, salonNotes }
        });
        res.json(updatedBooking);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.cancelBooking = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const booking = await prisma_1.default.booking.findUnique({
            where: { id },
            include: { salon: true, slot: true }
        });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        // Client can cancel their own booking, salon owner can cancel any booking for their salon
        const canCancel = booking.clientId === userId ||
            booking.salon.ownerId === userId ||
            userRole === 'ADMIN';
        if (!canCancel) {
            return res.status(403).json({ message: 'Not authorized to cancel this booking' });
        }
        // Update booking status
        await prisma_1.default.booking.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        // Update appointment status
        await prisma_1.default.appointment.update({
            where: { id: booking.appointmentId },
            data: { status: 'CANCELLED' }
        });
        // Make slot available again
        await prisma_1.default.slot.update({
            where: { id: booking.slotId },
            data: { isAvailable: true }
        });
        res.json({ message: 'Booking cancelled successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
