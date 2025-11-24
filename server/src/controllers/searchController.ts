import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const searchSalons = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      city, 
      location, 
      service, 
      minRating, 
      maxPrice, 
      sortBy = 'rating',
      page = 1, 
      limit = 10 
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { isActive: true };
    
    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query as string, mode: 'insensitive' } },
        { description: { contains: query as string, mode: 'insensitive' } },
        { location: { contains: query as string, mode: 'insensitive' } }
      ];
    }
    
    // Location filters
    if (city) where.city = city as string;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    
    // Rating filter
    if (minRating) where.averageRating = { gte: Number(minRating) };
    
    // Service filter
    if (service) {
      where.salonServices = {
        some: {
          service: {
            OR: [
              { name: { contains: service as string, mode: 'insensitive' } },
              { category: { contains: service as string, mode: 'insensitive' } }
            ]
          },
          ...(maxPrice && { price: { lte: Number(maxPrice) } })
        }
      };
    }
    
    // Sorting
    const orderBy: any = {};
    switch (sortBy) {
      case 'rating':
        orderBy.averageRating = 'desc';
        break;
      case 'reviews':
        orderBy.totalReviews = 'desc';
        break;
      case 'newest':
        orderBy.createdAt = 'desc';
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      default:
        orderBy.averageRating = 'desc';
    }
    
    const salons = await prisma.salon.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true } },
        salonServices: {
          include: { service: true },
          orderBy: { price: 'asc' }
        },
        reviews: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            client: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy,
      skip,
      take: Number(limit)
    });
    
    const total = await prisma.salon.count({ where });
    
    res.json({
      salons,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const searchServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { query, category, city, maxPrice } = req.query;
    
    const where: any = { isActive: true };
    
    if (query) {
      where.OR = [
        { name: { contains: query as string, mode: 'insensitive' } },
        { description: { contains: query as string, mode: 'insensitive' } }
      ];
    }
    
    if (category) where.category = category as string;
    
    const services = await prisma.service.findMany({
      where,
      include: {
        salonServices: {
          where: {
            salon: {
              isActive: true,
              ...(city && { city: city as string })
            },
            ...(maxPrice && { price: { lte: Number(maxPrice) } })
          },
          include: {
            salon: {
              select: {
                id: true,
                name: true,
                city: true,
                location: true,
                averageRating: true
              }
            }
          },
          orderBy: { price: 'asc' }
        }
      }
    });
    
    // Filter out services with no available salons
    const filteredServices = services.filter((service: { salonServices: string | any[]; }) => service.salonServices.length > 0);
    
    res.json(filteredServices);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});