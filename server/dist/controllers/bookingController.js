import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
import { DateTime } from "luxon";
import { createAndSendNotification } from "../services/notificationService.js";
import { getMyBookingsService, getOwnerBookingsService, getBookingsData } from "../services/aiService.js";
export const createBooking = asyncHandler(async (req, res) => {
    const { salonId, salonServiceId, slotDate, slotStartTime } = req.body;
    // slotDate = "2025-08-28", slotStartTime = "06:00"
    // console.log("req.body:", req.body);
    // console.log("salonServiceId:", req.body.salonServiceId);
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    // Fetch the salon service directly
    const salonService = await prisma.salonService.findUnique({
        where: { id: salonServiceId },
    });
    if (!salonService)
        return res.status(404).json({ error: "SalonService not found" });
    if (!salonServiceId) {
        throw new Error("Missing salonServiceId param");
    }
    const slotDuration = 60; // each slot = 60 mins
    const requiredSlots = Math.ceil(salonService.duration / slotDuration);
    // Combine date + time into a proper Date object in UTC
    console.log("slotDate:", slotDate, "slotStartTime:", slotStartTime);
    const startSlot = DateTime.fromISO(`${slotDate}T${slotStartTime}`, { zone: 'Africa/Nairobi' }).toJSDate();
    const slots = await prisma.slot.findMany({
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
    await prisma.slot.updateMany({
        where: { id: { in: slotIds } },
        data: { isAvailable: false },
    });
    // Create an appointment for the booked time (represents merged slot)
    const appointment = await prisma.appointment.create({
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
    const booking = await prisma.booking.create({
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
        include: {
            salonService: {
                include: {
                    service: true, // if salonService → service relation exists
                },
            },
            salon: true,
        },
    });
    const user = req.user;
    await createAndSendNotification({
        userId: booking.clientId,
        title: "Booking Confirmed",
        message: `Your booking for ${booking.salonService?.service.name} at ${booking.salon.name} is confirmed.`,
        type: "BOOKING_CONFIRMATION",
        data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
        sendEmail: true,
        emailTo: user.email,
    });
    await createAndSendNotification({
        userId: booking.salon.ownerId,
        title: "New Booking",
        message: `${user.firstName} ${user.lastName} booked ${booking.salonService?.service.name}.`,
        type: "BOOKING_CONFIRMATION",
        data: { bookingId: booking.id, client: booking.clientId },
        sendEmail: true,
        emailTo: user.email,
    });
    res.status(201).json({ booking, bookedSlots: slotIds, appointment });
});
export const getBookings = asyncHandler(async (req, res) => {
    try {
        const { status, salonId } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role;
        const bookings = await getBookingsData(userId, userRole, status, salonId);
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
export const getOwnerBookings = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const ownerId = req.user.id;
    if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only salon owners or admins can view bookings" });
    }
    const bookings = await getOwnerBookingsService(ownerId);
    res.json(bookings);
});
export const getMyBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const bookings = await getMyBookingsService(userId);
        res.json(bookings);
    }
    catch (err) {
        console.error("Error fetching bookings:", err);
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
};
// controllers/bookingController.ts
export const rescheduleBooking = asyncHandler(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const { id } = req.params;
        const { newDateTime } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        console.log("newDateTime:", newDateTime);
        if (!newDateTime) {
            return res.status(400).json({ message: "newDateTime is required" });
        }
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { salon: true, slot: true },
        });
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        // Authorization: client, salon owner, or admin
        const canReschedule = booking.clientId === userId ||
            booking.salon.ownerId === userId ||
            userRole === "ADMIN";
        if (!canReschedule) {
            return res.status(403).json({ message: "Not authorized to reschedule this booking" });
        }
        const originalDateTime = booking.slot.startTime;
        // 1. Find the new slot
        const newSlot = await prisma.slot.findFirst({
            where: {
                salonId: booking.salonId,
                startTime: new Date(newDateTime),
            },
        });
        if (!newSlot) {
            return res.status(400).json({ message: "No available slot at that time" });
        }
        // 2. Update the booking to link to the new slot
        const updatedBooking = await prisma.booking.update({
            where: { id },
            data: { slotId: newSlot.id },
            include: {
                salonService: {
                    include: {
                        service: true, // if salonService → service relation exists
                    },
                },
                salon: true,
                slot: true,
            },
        });
        await createAndSendNotification({
            userId: booking.clientId,
            title: "Booking Rescheduled",
            message: `Your booking for ${updatedBooking.salonService.service.name} at ${updatedBooking.salon.name} has been rescheduled to ${new Date(updatedBooking.slot.startTime).toLocaleString()}.`,
            type: "BOOKING_REMINDER",
            data: { bookingId: booking.id },
            sendEmail: true,
            emailTo: req.user.email,
        });
        const user = req.user;
        await createAndSendNotification({
            userId: booking.salon.ownerId,
            title: "Booking Rescheduled",
            message: `${user.firstName} ${user.lastName} rescheduled ${updatedBooking.salonService.service.name} to ${new Date(updatedBooking.slot.startTime).toLocaleString()}.`,
            type: "BOOKING_REMINDER",
            data: { bookingId: booking.id },
            sendEmail: true,
            emailTo: req.user.email,
        });
        res.json({
            message: "Booking rescheduled successfully",
            originalDateTime: booking.slot.startTime,
            newDateTime: updatedBooking.slot.startTime,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const cancelBooking = asyncHandler(async (req, res) => {
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: { salon: true,
                slot: true,
                salonService: {
                    include: {
                        service: true, // if salonService → service relation exists
                    },
                },
            }
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
        await prisma.booking.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        // Update appointment status
        await prisma.appointment.update({
            where: { id: booking.appointmentId },
            data: { status: 'CANCELLED' }
        });
        // Make slot available again
        await prisma.slot.update({
            where: { id: booking.slotId },
            data: { isAvailable: true }
        });
        await createAndSendNotification({
            userId: booking.clientId,
            title: "Booking Cancelled",
            message: `Your booking for ${booking.salonService.service.name} at ${booking.salon.name} has been cancelled.`,
            type: "BOOKING_CANCELLATION",
            data: { bookingId: booking.id },
            sendEmail: true,
            emailTo: req.user.email,
        });
        const user = req.user;
        await createAndSendNotification({
            userId: booking.salon.ownerId,
            title: "Booking Cancelled",
            message: `${user.firstName} ${user.lastName} cancelled their booking for ${booking.salonService.service.name}.`,
            type: "BOOKING_CANCELLATION",
            data: { bookingId: booking.id },
            sendEmail: true,
            emailTo: req.user.email,
        });
        res.json({ message: 'Booking cancelled successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
