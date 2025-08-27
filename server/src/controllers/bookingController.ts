import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
import { DateTime } from "luxon";

export const createBooking = asyncHandler(async (req: UserRequest, res: Response) => {
  const { salonId, salonServiceId, slotDate, slotStartTime } = req.body; 
  // slotDate = "2025-08-28", slotStartTime = "06:00"

  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  // Fetch the salon service directly
  const salonService = await prisma.salonService.findUnique({
    where: { id: salonServiceId },
  });

  if (!salonService) return res.status(404).json({ error: "SalonService not found" });

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
  const slotIds = slots.map(s => s.id);
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
      serviceId: salonService.id, // Use SalonService ID
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
      serviceId: salonService.id,
      appointmentId: appointment.id,
      slotId: slotIds[0], // first slot
    },
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
        where.salonId = { in: ownedSalons.map(s => s.id) };
      }
    } else if (userRole === 'ADMIN' && salonId) {
      where.salonId = salonId as string;
    }
    
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, phone: true } },
        salon: { select: { name: true } },
        service: { select: { name: true, category: true } },
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

export const getBooking = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { firstName: true, lastName: true, phone: true } },
        salon: { 
          select: { name: true, ownerId: true }
        },
        service: { select: { name: true, category: true } },
        appointment: true,
        payment: true,
        review: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check authorization
    const isOwner = booking.clientId === userId;
    const isSalonOwner = booking.salon.ownerId === userId;
    const isAdmin = userRole === 'ADMIN';
    
    if (!isOwner && !isSalonOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }
    
    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

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
    SELECT b.id, b."bookingNumber", b."totalAmount", b.status,
           b."createdAt", b."updatedAt",
           s.id as "salonId", s.name as "salonName",
           u.id as "clientId", u."firstName", u."lastName", u.email, u.phone
    FROM bookings b
    JOIN salons s ON b."salonId" = s.id
    JOIN users u ON b."clientId" = u.id
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

    const bookings = await prisma.booking.findMany({
      where: { clientId: userId },
      include: {
        salon: { select: { name: true } },
        service: { select: { name: true } },
        appointment: true, // date, startTime, endTime, status
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
export const updateBooking = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, salonNotes } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { salon: true }
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Only salon owner can update booking status and add salon notes
    if (booking.salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to update this booking' });
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status, salonNotes }
    });
    
    res.json(updatedBooking);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const booking = await prisma.booking.findUnique({
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
    await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' }
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
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});