import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { bookingId, rating, comment, images } = req.body;
    const userId = (req as any).user.userId;
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true }
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.clientId !== userId) {
      return res.status(403).json({ message: 'Not authorized to review this booking' });
    }
    
    if (booking.review) {
      return res.status(400).json({ message: 'Review already exists for this booking' });
    }
    
    // if (booking.status !== 'COMPLETED') {
    //   return res.status(400).json({ message: 'Can only review completed bookings' });
    // }
    
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        images: images || [],
        clientId: userId,
        salonId: booking.salonId,
        bookingId
      }
    });
    
    // Update salon's average rating
    const salonReviews = await prisma.review.findMany({
      where: { salonId: booking.salonId }
    });
    
    const averageRating = salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length;
    
    await prisma.salon.update({
      where: { id: booking.salonId },
      data: {
        averageRating,
        totalReviews: salonReviews.length
      }
    });
    
    res.status(201).json(review);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const getSalonRating = asyncHandler(async (req: Request, res: Response) => {
  const { salonId } = req.params;

  const reviews = await prisma.review.findMany({
    where: { salonId },
    select: { rating: true },
  });

  if (!reviews.length) {
    return res.json({ averageRating: 0, totalReviews: 0 });
  }

  const averageRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  res.json({
    averageRating: parseFloat(averageRating.toFixed(1)), // e.g. 4.5
    totalReviews: reviews.length,
  });
});
export const getReviews = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { salonId, clientId, rating } = req.query;
    
    const where: any = {};
    if (salonId) where.salonId = salonId as string;
    if (clientId) where.clientId = clientId as string;
    if (rating) where.rating = { gte: Number(rating) };
    
    const reviews = await prisma.review.findMany({
      where,
      include: {
        client: { select: { firstName: true, lastName: true, avatar: true } },
        salon: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, images } = req.body;
    const userId = (req as any).user.userId;
    
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    if (review.clientId !== userId) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }
    
    const updatedReview = await prisma.review.update({
      where: { id },
      data: { rating, comment, images }
    });
    
    // Recalculate salon's average rating
    const salonReviews = await prisma.review.findMany({
      where: { salonId: review.salonId }
    });
    
    const averageRating = salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length;
    
    await prisma.salon.update({
      where: { id: review.salonId },
      data: { averageRating }
    });
    
    res.json(updatedReview);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const review = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    if (review.clientId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }
    
    await prisma.review.delete({
      where: { id }
    });
    
    // Recalculate salon's average rating
    const salonReviews = await prisma.review.findMany({
      where: { salonId: review.salonId }
    });
    
    const averageRating = salonReviews.length > 0 
      ? salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length
      : 0;
    
    await prisma.salon.update({
      where: { id: review.salonId },
      data: {
        averageRating,
        totalReviews: salonReviews.length
      }
    });
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});