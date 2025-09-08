import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const addSalonService = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId, price, duration } = req.body;
  const userId = (req as any).user.userId;

  // Find the salon belonging to this owner
  const salon = await prisma.salon.findFirst({
    where: { ownerId: userId },
  });

  if (!salon) {
    return res.status(404).json({ message: "Salon not found for this owner" });
  }

  const salonService = await prisma.salonService.create({
    data: {
      serviceId,
      salonId: salon.id, // automatically bound to owner’s salon
      price,
      duration,
    },
    include: { service: true },
  });

  res.status(201).json(salonService);
});


export const updateSalonService = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, duration } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    const salonService = await prisma.salonService.findUnique({
      where: { id },
      include: { salon: true }
    });
    
    if (!salonService) {
      return res.status(404).json({ message: 'Salon service not found' });
    }
    
    if (salonService.salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to update this salon service' });
    }
    
    const updatedSalonService = await prisma.salonService.update({
      where: { id },
      data: { price, duration },
      include: { service: true }
    });
    
    res.json(updatedSalonService);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const removeSalonService = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    
    const salonService = await prisma.salonService.findUnique({
      where: { id },
      include: { salon: true }
    });
    
    if (!salonService) {
      return res.status(404).json({ message: 'Salon service not found' });
    }
    
    if (salonService.salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to remove this salon service' });
    }
    
    await prisma.salonService.delete({
      where: { id }
    });
    
    res.json({ message: 'Salon service removed successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});
export const getOwnerServices = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: only salon owners or admins can view this" });
  }

  const salons = await prisma.salon.findMany({
    where: { ownerId: req.user.id },
    include: {
      salonServices: {
        include: { service: true },
      },
    },
  });

  if (!salons.length) {
    return res.status(404).json({ message: "No salons found for this owner" });
  }

  // Normalize shape for frontend
  const services = salons.flatMap((salon) =>
    salon.salonServices.map((ss) => ({
      id: ss.id, // 👈 salonService id
      price: ss.price,
      duration: ss.duration,
      service: {
        id: ss.service.id,     // base service id
        name: ss.service.name, // base service name
        active: ss.service.isActive,
      },
    }))
  );

  res.json(services);
});


