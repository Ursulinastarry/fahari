import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { pool } from "../index";
import prisma from "../config/prisma";
import { DateTime } from "luxon";
import { createAndSendNotification } from "../services/notificationService";

interface CreateBookingBody {
  salonId: string;
  salonServiceId: string;
  slotDate: string;       // ISO date string, we can convert later
  slotStartTime: string;  // e.g. "14:00"
}

type CreateBookingRequest = Omit<UserRequest, "body"> & { body: CreateBookingBody };
export const createBooking = asyncHandler(
  async (req: CreateBookingRequest, res: Response) => {
    const { salonId, salonServiceId, slotDate, slotStartTime } = req.body;
  // slotDate = "2025-08-28", slotStartTime = "06:00"
// console.log("req.body:", req.body);
// console.log("salonServiceId:", req.body.salonServiceId);

  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  // Fetch the salon service directly
  const salonService = await prisma.salonService.findUnique({
    where: { id: salonServiceId  },
  });

  if (!salonService) return res.status(404).json({ error: "SalonService not found" });
  
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
  const slotIds = slots.map((s: { id: any; }) => s.id);
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
    salon: true,},
  });
  const user=req.user;
 await createAndSendNotification({
    userId: booking.clientId,
    title: "Booking Confirmed",
    message: `Your booking for ${booking.salonService?.service.name} at ${booking.salon.name} is confirmed.`,
    type: "BOOKING_CONFIRMATION",
    data: { bookingId: booking.id, bookingNumber: booking.bookingNumber }
  });
  await createAndSendNotification({
    userId: booking.salon.ownerId,
    title: "New Booking",
    message: `${user.firstName} ${user.lastName} booked ${booking.salonService?.service.name}.`,
    type: "BOOKING_CONFIRMATION",
    data: { bookingId: booking.id, client: booking.clientId }
  });
  res.status(201).json({ booking, bookedSlots: slotIds, appointment });
});
export const getBookings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { status, salonId } = req.query;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    const where: any = {};
    if (status) where.status = status as string;
    
    // Filter based on user role
    if (userRole === 'CLIENT') {
      where.clientId = userId;
    } else if (userRole === 'SALON_OWNER') {
      if (salonId) {
        // Verify salon ownership
        const salon = await prisma.salon.findFirst({
          where: { id: salonId as string, ownerId: userId }
        });
        if (!salon) {
          return res.status(403).json({ message: 'Not authorized to view bookings for this salon' });
        }
        where.salonId = salonId as string;
      } else {
        // Get all bookings for owned salons
        const ownedSalons = await prisma.salon.findMany({
          where: { ownerId: userId },
          select: { id: true }
        });
        where.salonId = { in: ownedSalons.map((s: { id: any; }) => s.id) };
      }
    } else if (userRole === 'ADMIN' && salonId) {
      where.salonId = salonId as string;
    }
    
    const bookings = await prisma.booking.findMany({
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
  } catch (error: any) {
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

export const getOwnerBookings = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const ownerId = req.user.id;

  // Only SALON_OWNER or ADMIN should be allowed
  if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only salon owners or admins can view bookings" });
  }

  // Query all bookings for salons owned by this user
  const { rows } = await pool.query(
  `
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
  `,
  [ownerId]
);

  res.json(rows);
});
export const getMyBookings = async (req: UserRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const {rows:bookingArray} =  await pool.query(
    `
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
    `,
    [userId]
  );

    res.json(bookingArray);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : err });
  }
};
// controllers/bookingController.ts
export const rescheduleBooking = asyncHandler(async (req: UserRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { id } = req.params;
    const { newDateTime } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
console.log("newDateTime:", newDateTime);
    if (!newDateTime) {
      return res.status(400).json({ message: "newDateTime is required" });
    }
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { salon: true , slot: true },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Authorization: client, salon owner, or admin
    const canReschedule =
      booking.clientId === userId ||
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
    message: `Your booking for ${updatedBooking.salonService!.service.name} at ${updatedBooking.salon.name} has been rescheduled to ${new Date(updatedBooking.slot.startTime).toLocaleString()}.`,
    type: "BOOKING_REMINDER",
    data: { bookingId: booking.id }
  });
const user=req.user;
  await createAndSendNotification({
    userId: booking.salon.ownerId,
    title: "Booking Rescheduled",
    message: `${user.firstName} ${user.lastName} rescheduled ${updatedBooking.salonService!.service.name} to ${new Date(updatedBooking.slot.startTime).toLocaleString()}.`,
    type: "BOOKING_REMINDER",
    data: { bookingId: booking.id }
  });
res.json({
  message: "Booking rescheduled successfully",
  originalDateTime: booking.slot.startTime,
  newDateTime: updatedBooking.slot.startTime,
});
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


export const cancelBooking = asyncHandler(async (req: UserRequest, res: Response) => {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
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
    message: `Your booking for ${booking.salonService!.service.name} at ${booking.salon.name} has been cancelled.`,
    type: "BOOKING_CANCELLATION",
    data: { bookingId: booking.id }
  });
const user=req.user;
  await createAndSendNotification({
    userId: booking.salon.ownerId,
    title: "Booking Cancelled",
    message: `${user.firstName} ${user.lastName} cancelled their booking for ${booking.salonService!.service.name}.`,
    type: "BOOKING_CANCELLATION",
    data: { bookingId: booking.id }
  });
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});