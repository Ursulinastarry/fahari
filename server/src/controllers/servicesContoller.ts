import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const createService = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, category, isActive } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Service name is required" });
  }

  const exists = await prisma.service.findFirst({ where: { name } });
  if (exists) {
    return res.status(400).json({ message: "Service already exists" });
  }

  const service = await prisma.service.create({
    data: {
      name,
      description,
      category,
      isActive: isActive ?? true,
    },
  });

  res.status(201).json(service);
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, category, isActive } = req.body;

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: name ?? service.name,
      description: description ?? service.description,
      category: category ?? service.category,
      isActive: isActive ?? service.isActive,
    },
  });

  res.json(updated);
});
export const getAllServices = asyncHandler(async (req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });
  res.json(services);
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const role = (req as any).user.role;

  if (role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can delete base services" });
  }

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  // If you want cascade delete of salonServices, add: `await prisma.salonService.deleteMany({ where: { serviceId: id } });`

  await prisma.service.delete({ where: { id } });

  res.json({ message: "Service deleted successfully" });
});