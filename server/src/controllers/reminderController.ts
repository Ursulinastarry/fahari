import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const createReminder = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { bookingId, type, scheduledFor, message, channel } = req.body;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { salon: true }
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Only salon owner or admin can create reminders
    if (booking.salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to create reminders for this booking' });
    }
    
    const reminder = await prisma.reminder.create({
      data: {
        bookingId,
        type,
        scheduledFor: new Date(scheduledFor),
        message,
        channel
      }
    });
    
    res.status(201).json(reminder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const getReminders = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { bookingId, sent } = req.query;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const where: any = {};
    if (bookingId) where.bookingId = bookingId as string;
    if (sent !== undefined) {
      where.sentAt = sent === 'true' ? { not: null } : null;
    }
    
    // Filter by user's bookings or owned salons
    if (userRole === 'CLIENT') {
      const clientBookings = await prisma.booking.findMany({
        where: { clientId: userId },
        select: { id: true }
      });
      where.bookingId = { in: clientBookings.map(b => b.id) };
    } else if (userRole === 'SALON_OWNER') {
      const ownedSalons = await prisma.salon.findMany({
        where: { ownerId: userId },
        select: { id: true }
      });
      const salonBookings = await prisma.booking.findMany({
        where: { salonId: { in: ownedSalons.map(s => s.id) } },
        select: { id: true }
      });
      where.bookingId = { in: salonBookings.map(b => b.id) };
    }
    
    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        booking: {
          include: {
            client: { select: { firstName: true, lastName: true } },
            salon: { select: { name: true } }
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });
    
    res.json(reminders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const markReminderAsSent = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;
    
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can mark reminders as sent' });
    }
    
    const reminder = await prisma.reminder.update({
      where: { id },
      data: { sentAt: new Date() }
    });
    
    res.json(reminder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});