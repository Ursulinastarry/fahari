import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getSalonsService } from "@/services/aiService";
import { createAndSendNotification } from "@/services/notificationService";
// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/salons/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});
export const uploadSalonMedia = multer({ storage });

const prisma = new PrismaClient();

export const createSalon = async (req: UserRequest, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    if (userRole !== "SALON_OWNER" && userRole !== "ADMIN") {
      return res.status(403).json({ message: "Only salon owners can create salons." });
    }

    // With FormData, text fields come through req.body
    const {
      name,
      description,
      email,
      phone,
      address,
      city,
      location,
      businessHours // This is a JSON string from FormData
    } = req.body;

    // Parse businessHours since it comes as JSON string
    let parsedBusinessHours = {};
    if (businessHours) {
      try {
        parsedBusinessHours = JSON.parse(businessHours);
      } catch (e) {
        return res.status(400).json({ message: "Invalid businessHours format" });
      }
    }

    // Files come through req.files (handled by multer)
    const files = req.files as unknown as { [fieldname: string]: Express.Multer.File[] };
    console.log("files received",files)
    const profileImage = files?.profileImage?.[0]?.filename || null;
    const coverImage = files?.coverImage?.[0]?.filename || null;
    const gallery = files?.gallery?.map(file => file.filename) || [];

    const salon = await prisma.salon.create({
      data: {
        name,
        description,
        email,
        phone,
        address,
        city,
        location,
        businessHours: parsedBusinessHours,
        profileImage,
        coverImage,
        gallery,
        owner: {
          connect: { id: userId }
        }
      }
    });
    await createAndSendNotification({
  role: "ADMIN",
  title: "New salon registration",
  message: `New salon ${salon.name} registered and is awaiting approval.`,
  type: "GENERAL",
  data: { id: salon.id, email: salon.email },
  sendEmail: true,
  emailTo: "admin@faharibeauty.com"
});

  // Notify the salon owner
  await createAndSendNotification({
    userId: userId,
    title: "Salon pending approval",
    message: "Thanks for registering your salon with us! Contact us to verify your salon!.",
    type: "GENERAL",
    sendEmail: true,
    emailTo: salon.email || undefined
  });
    res.status(201).json(salon);
  } catch (error: any) {
    console.error("❌ Error creating salon:", error);
    res.status(500).json({ message: error.message });
  }
};
export const approveSalon = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can approve salons" });
  }

  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE salons SET "isVerified" = true, "isActive" = true WHERE id = $1 RETURNING *`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ message: "Salon not found" });

  const salon = rows[0];

  await createAndSendNotification({
    userId: salon.ownerId,
    title: "Salon verified!",
    message: "You can now log in and manage your salon.",
    type: "GENERAL",
    sendEmail: true,
    emailTo: salon.email || undefined,
  });

  res.json({ message: "Salon approved successfully", salon });
});

/**
 * Suspend a salon(Admins only)
 */
export const suspendSalon = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can suspend salons" });
  }

  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE salons SET "isActive" = false WHERE id = $1 RETURNING *`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ message: "User not found" });

  const salon = rows[0];

  await createAndSendNotification({
    userId: salon.ownerId,
    title: "Salon suspended",
    message: "Your salon has been suspended. Please contact support.",
    type: "GENERAL",
    sendEmail: true,
    emailTo: salon.email || undefined,
  });

  res.json({ message: "Salon suspended successfully", salon });
});
export const getSalons = async (req: Request, res: Response) => {
  try {
    const data = await getSalonsService(req.query);
    res.json(data);
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

export const updateSalon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Find existing salon
    const salon = await prisma.salon.findUnique({
      where: { id },
    });

    if (!salon) {
      return res.status(404).json({ message: "Salon not found" });
    }

    if (salon.ownerId !== userId && userRole !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized to update this salon" });
    }

    // Extract text fields
    const {
      name,
      description,
      email,
      phone,
      address,
      city,
      location,
      businessHours,
    } = req.body;
   const businessHoursData = typeof req.body.businessHours === 'string' 
    ? JSON.parse(req.body.businessHours)
    : req.body.businessHours;
    // Handle uploaded files
    const files = req.files as unknown as { [fieldname: string]: Express.Multer.File[] };
    console.log("files",files);
    // Initialize with existing values
    let profileImage = salon.profileImage;
    let coverImage = salon.coverImage;
    let gallery = salon.gallery || [];

    // Handle profile image update
    if (files?.profileImage?.[0]) {
      const newProfileImage = files.profileImage[0].filename;
      
      // Delete old profile image if it exists
      if (salon.profileImage) {
        deleteFileIfExists(path.join(__dirname, "../../uploads/salons", salon.profileImage));
      }
      profileImage = newProfileImage;
    }

    // Handle cover image update
    if (files?.coverImage?.[0]) {
      const newCoverImage = files.coverImage[0].filename;
      
      // Delete old cover image if it exists
      if (salon.coverImage) {
        deleteFileIfExists(path.join(__dirname, "../../uploads/salons", salon.coverImage));
      }
            console.log("deleted a file",salon.coverImage);

      coverImage = newCoverImage;
    }

    // Handle gallery images update
    if (files?.gallery && files.gallery.length > 0) {
      const newGalleryFiles = files.gallery.map((file) => file.filename);
      
      // Delete old gallery images if they exist
      if (salon.gallery && salon.gallery.length > 0) {
        salon.gallery.forEach((oldFile: string) => {
          deleteFileIfExists(path.join(__dirname, "../../uploads/salons", oldFile));
        });
      }
      
      gallery = newGalleryFiles;
    }

    // Update salon in database
    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: {
        name: name || salon.name,
        description: description || salon.description,
        email: email || salon.email,
        phone: phone || salon.phone,
        address: address || salon.address,
        city: city || salon.city,
        location: location || salon.location,
        businessHours: businessHoursData,
        profileImage,
        coverImage,
        gallery,
      },
    });

    res.json(updatedSalon);
  } catch (error: any) {
    console.error("Error updating salon:", error);
    res.status(500).json({ message: error.message });
  }
};

// Helper function to safely delete files
export const deleteFileIfExists = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

export const deleteSalon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
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
    
    res.json({ message: 'Salon deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};



