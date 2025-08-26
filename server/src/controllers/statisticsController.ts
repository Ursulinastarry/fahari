import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const getSalonStatistics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { salonId } = req.params;
    const { startDate, endDate } = req.query;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const salon = await prisma.salon.findUnique({
      where: { id: salonId }
    });
    
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }
    
    if (salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to view statistics for this salon' });
    }
    
    const where: any = { salonId };
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    const statistics = await prisma.salonStatistic.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    
    res.json(statistics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const getPlatformStatistics = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Only admins can view platform statistics' });
    }
    
    const { startDate, endDate } = req.query;
    
    const where: any = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    
    const statistics = await prisma.platformStatistic.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    
    res.json(statistics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});