import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const addSalonService = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { salonId, serviceId, price, duration } = req.body;
    const id = (req as any).user.id;
    const role = (req as any).user.role;
    
    const salon = await prisma.salon.findUnique({
      where: { id: salonId }
    });
    
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }
    
    if (salon.ownerId !== id && role !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to add services to this salon' });
    }
    
    const salonService = await prisma.salonService.create({
      data: {
        salonId,
        serviceId,
        price,
        duration
      },
      include: {
        service: true
      }
    });
    
    res.status(201).json(salonService);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const updateSalonService = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, duration } = req.body;
    const userId = (req as any).user.userId;
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
    const userId = (req as any).user.userId;
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

  // Only SALON_OWNER (and maybe ADMIN) should access this
  if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: only salon owners or admins can view this" });
  }

  // Find all salons owned by this user
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

  // Flatten out services from all salons
  const services = salons.flatMap((salon) =>
    salon.salonServices.map((ss) => ({
      salonId: salon.id,
      salonName: salon.name,
      serviceId: ss.service.id,
      serviceName: ss.service.name,
      price: ss.price,
      duration: ss.duration,
      isActive: ss.service.isActive,
    }))
  );

  res.json(services);
});

