import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const createSlot = asyncHandler(async (req: Request, res: Response) => {
 try {
    const { salonId, serviceId, date, startTime, endTime, isRecurring } = req.body;

    // Combine into ISO timestamps
    const start = new Date(`${date}T${startTime}:00.000Z`);
    const end = new Date(`${date}T${endTime}:00.000Z`);

    console.log("DEBUG start:", start, "end:", end);

    const slot = await prisma.slot.create({
      data: {
        salonId,
        serviceId,
        date: new Date(date), // just the day
        startTime: start,
        endTime: end,
        isRecurring: Boolean(isRecurring),
        isAvailable: true,
      },
    });

    res.status(201).json(slot);
  } catch (err) {
    console.error("Error creating slot:", err);
    res.status(500).json({ error: "Failed to create slot" });
  }
});

export const getSlots = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { salonId, date, serviceId, isAvailable } = req.query;
    
    const where: any = {};
    if (salonId) where.salonId = salonId as string;
    if (date) where.date = new Date(date as string);
    if (serviceId) where.serviceId = serviceId as string;
    if (isAvailable !== undefined) where.isAvailable = Boolean(isAvailable);
    
    const slots = await prisma.slot.findMany({
      where,
      include: {
        salon: {
          select: { name: true }
        },
        service: {
          select: { name: true, category: true }
        }
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });
    
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const updateSlot = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const slot = await prisma.slot.findUnique({
      where: { id },
      include: { salon: true }
    });
    
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to update this slot' });
    }
    
    const updatedSlot = await prisma.slot.update({
      where: { id },
      data: req.body
    });
    
    res.json(updatedSlot);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const deleteSlot = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const slot = await prisma.slot.findUnique({
      where: { id },
      include: { salon: true }
    });
    
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }
    
    if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this slot' });
    }
    
    await prisma.slot.delete({
      where: { id }
    });
    
    res.json({ message: 'Slot deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});