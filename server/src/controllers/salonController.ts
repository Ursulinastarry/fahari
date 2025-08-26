import { Request, Response, NextFunction } from "express";
// import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
// At the top of your file
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";

const prisma = new PrismaClient();
export const createSalon = async (req: UserRequest, res: Response) => {
  try {
    const userId = (req as any).user.id; // 🔥 make sure this matches protect
    const userRole = (req as any).user.role;

    if (userRole !== "SALON_OWNER" && userRole !== "ADMIN") {
      return res.status(403).json({ message: "Only salon owners can create salons" });
    }

    const {
      name,
      description,
      email,
      phone,
      address,
      city,
      location,
      latitude,
      longitude,
      businessHours,
      profileImage,
      coverImage,
      gallery
    } = req.body;

    const salon = await prisma.salon.create({
      data: {
        name,
        description,
        email,
        phone,
        address,
        city,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        businessHours,
        profileImage,
        coverImage,
        gallery: gallery || [],
        owner: {
          connect: { id: userId }
        }
      }
    });

    res.status(201).json(salon);
  } catch (error: any) {
    console.error("❌ Error creating salon:", error);
    res.status(500).json({ message: error.message });
  }
};


export const getSalons = async (req: Request, res: Response) => {
    try {
    const { city, location, isActive = true, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = { isActive: Boolean(isActive) };
    if (city) where.city = city;
    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    
    const salons = await prisma.salon.findMany({
      where,
      include: {
        owner: {
          select: { firstName: true, lastName: true }
        },
        salonServices: {
          include: { service: true }
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      skip,
      take: Number(limit),
      orderBy: { averageRating: 'desc' }
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
};

export const getSalon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const salon = await prisma.salon.findUnique({
      where: { id },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true }
        },
        salonServices: {
          include: { service: true }
        },
        reviews: {
          include: {
            client: {
              select: { firstName: true, lastName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        slots: {
          where: {
            date: { gte: new Date() },
            isAvailable: true
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        }
      }
    });
    
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }
    
    res.json(salon);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const getMySalon = async (req: UserRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Fetch salons where ownerId = logged-in user's id
  const { rows } = await pool.query(
    `SELECT id, name, description, email, phone, address, city, location, latitude, longitude,
            "businessHours", "isActive", "isVerified", "averageRating", "totalReviews",
            "profileImage", "coverImage", gallery, "createdAt", "updatedAt"
     FROM salons
     WHERE "ownerId" = $1`,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "No salon found for this owner" });
  }

  res.json(rows);
};

export const getSalonServices = async (req: Request, res: Response) => {
  const { salonId } = req.params;

  if (!salonId) {
    return res.status(400).json({ message: "Salon ID is required" });
  }

  const services = await prisma.salonService.findMany({
    where: { salonId },
    include: {
      service: true, // brings in full service details
    },
  });

  if (!services.length) {
    return res.status(404).json({ message: "No services found for this salon" });
  }

  res.json(services);
};

export const updateSalon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const salon = await prisma.salon.findUnique({
      where: { id }
    });
    
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }
    
    if (salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to update this salon' });
    }
    
    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: req.body
    });
    
    res.json(updatedSalon);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSalon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const salon = await prisma.salon.findUnique({
      where: { id }
    });
    
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found' });
    }
    
    if (salon.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this salon' });
    }
    
    await prisma.salon.delete({
      where: { id }
    });
    
    res.json({ message: 'Salon deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

function asyncHandler(arg0: (req: Request, res: Response) => Promise<any>) {
  throw new Error("Function not implemented.");
}
