import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middlewares/asyncHandler";
import dotenv from "dotenv";
import { UserRequest } from "../utils/types/userTypes";
import { PrismaClient } from '@prisma/client';
import { pool } from "../index";
import prisma from "../config/prisma";
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, method, transactionId, mpesaReceiptNumber } = req.body;
    const userId = (req as any).user.userId;
    
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { salon: true }
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Only the client who made the booking can create payment
    if (booking.clientId !== userId) {
      return res.status(403).json({ message: 'Not authorized to make payment for this booking' });
    }
    
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount,
        method,
        transactionId,
        mpesaReceiptNumber,
        status: 'PROCESSING'
      }
    });
    
    res.status(201).json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export const updatePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, failureReason } = req.body;
    const userRole = (req as any).user.role;
    
    // Only admin or system can update payment status
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Not authorized to update payment status' });
    }
    
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status,
        failureReason,
        processedAt: status === 'COMPLETED' ? new Date() : undefined
      }
    });
    
    // If payment is completed, update booking status
    if (status === 'COMPLETED') {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' }
      });
      
      await prisma.appointment.update({
        where: { id: (await prisma.booking.findUnique({ 
          where: { id: payment.bookingId } 
        }))?.appointmentId! },
        data: { status: 'CONFIRMED' }
      });
    }
    
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});