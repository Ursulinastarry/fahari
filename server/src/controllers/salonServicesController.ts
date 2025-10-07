import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
import { getSalonServicesService,getOwnerServicesService } from "@/services/aiService";
export const addSalonService = asyncHandler(async (req: Request, res: Response) => {
  const { serviceId, price, duration } = req.body;
  const { salonId } = req.params; // Get from URL
  const userId = (req as any).user.userId;

  // Verify the salon belongs to this owner
  const salon = await prisma.salon.findFirst({
    where: { 
      id: salonId,
      ownerId: userId, // Ensure ownership
    },
  });

  if (!salon) {
    return res.status(404).json({ 
      message: "Salon not found or you don't have permission to modify it" 
    });
  }

  // Check if this service already exists for this salon
  const existingService = await prisma.salonService.findUnique({
    where: {
      salonId_serviceId: {
        salonId: salon.id,
        serviceId: serviceId,
      },
    },
  });

  if (existingService) {
    return res.status(409).json({ 
      message: "This service already exists for this salon" 
    });
  }

  const salonService = await prisma.salonService.create({
    data: {
      serviceId,
      salonId: salon.id,
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

  const services = await getOwnerServicesService(req.user.id);

  if (!services.length) {
    return res.status(404).json({ message: "No services found for this owner" });
  }

  res.json(services);
});


export const getSalonServices = async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;
    const services = await getSalonServicesService(salonId);
    res.json(services);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

