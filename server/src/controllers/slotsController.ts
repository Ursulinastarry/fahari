import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
import { DateTime } from 'luxon';
import { getSlotsService,getOwnerSlotsService } from "../services/aiService";

export const createSlot = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { salonId, serviceId, date, startTime, endTime, isRecurring } = req.body;

    // Parse the date in EAT timezone
    const day = DateTime.fromISO(date, { zone: "Africa/Nairobi" }).startOf("day");

    // Combine day + startTime/endTime in EAT
    const start = day.plus({
      hours: Number(startTime.split(":")[0]),
      minutes: Number(startTime.split(":")[1] || 0),
    }).toJSDate();

    const end = day.plus({
      hours: Number(endTime.split(":")[0]),
      minutes: Number(endTime.split(":")[1] || 0),
    }).toJSDate();

    console.log("DEBUG start:", start, "end:", end);

    const slot = await prisma.slot.create({
      data: {
        salonId,
        serviceId,
        date: day.toJSDate(), // store only the day
        startTime: start,     // full datetime
        endTime: end,         // full datetime
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


export const getSlots = async (req: Request, res: Response) => {
  try {
    const slots = await getSlotsService(req.query);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalonSlots = asyncHandler(async (req: UserRequest, res: Response) => {
    console.log("get slots");

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const slots = await getOwnerSlotsService(req.user.id);
  res.json(slots);
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