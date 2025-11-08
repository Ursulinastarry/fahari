import { Response } from 'express';
import asyncHandler from '../middlewares/asyncHandler';
import prisma from '../config/prisma';
import { mpesaService } from '../services/mpesaService';
import { DateTime } from 'luxon';

const TRANSACTION_FEE_PERCENTAGE = 0.02; // 2%

// Initiate payment (ALWAYS creates booking first)
export const initiatePayment = asyncHandler(async (req: any, res: Response) => {
  const { salonId, salonServiceId, slotDate, slotStartTime, phoneNumber, paymentMethod } = req.body;

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Validate payment method
  if (!['MPESA', 'CASH'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  // Fetch salon service
  const salonService = await prisma.salonService.findUnique({
    where: { id: salonServiceId },
    include: { service: true, salon: true }
  });

  if (!salonService) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const baseAmount = salonService.price;
  const transactionFee = Math.ceil(baseAmount * TRANSACTION_FEE_PERCENTAGE);
  const totalAmount = baseAmount + transactionFee;
  const salonOwnerAmount = baseAmount;

  // ✅ STEP 1: Always create booking first (regardless of payment method)
  const booking = await createBookingFromPaymentData({
    userId: req.user.id,
    salonId,
    salonServiceId,
    slotDate,
    slotStartTime,
    totalAmount,
    transactionFee,
    salonOwnerAmount,
    paymentMethod
  });

  // ✅ STEP 2: Create payment record linked to booking
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      amount: totalAmount,
      paymentMethod: paymentMethod,
      status: 'PENDING'
    } as any
  });

  // ✅ STEP 3: Handle payment method
  if (paymentMethod === 'MPESA') {
    if (!phoneNumber) {
      // Rollback booking if no phone number
      await cancelBooking(booking.id);
      return res.status(400).json({ error: 'Phone number required for M-Pesa' });
    }

    try {
      const stkResponse = await mpesaService.initiateSTKPush(
        phoneNumber,
        totalAmount,
        booking.bookingNumber,
        `Payment for ${salonService.service.name}`
      );

      // Update payment with M-Pesa details
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          mpesaCheckoutRequestId: stkResponse.CheckoutRequestID,
          mpesaMerchantRequestId: stkResponse.MerchantRequestID,
        } as any
      });

      return res.status(200).json({
        success: true,
        message: 'Payment initiated. Please complete on your phone.',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        paymentId: payment.id,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        amount: totalAmount,
        transactionFee: transactionFee
      });
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      // Cancel booking on payment failure
      await cancelBooking(booking.id);
      return res.status(500).json({ 
        error: 'Payment initiation failed',
        details: error.response?.data || error.message 
      });
    }
  }

  // Handle Cash payment
  if (paymentMethod === 'CASH') {
    // For cash, booking is confirmed immediately
    return res.status(200).json({
      success: true,
      message: 'Booking confirmed. Pay cash at the salon.',
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      paymentId: payment.id,
      amount: totalAmount,
      transactionFee: transactionFee
    });
  }
});

// M-Pesa callback handler
export const mpesaCallback = asyncHandler(async (req: any, res: Response) => {
  const { Body } = req.body;

  if (!Body || !Body.stkCallback) {
    return res.status(400).json({ error: 'Invalid callback data' });
  }

  const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;

  // Find payment record
  const payment = await prisma.payment.findFirst({
    where: { mpesaCheckoutRequestId: CheckoutRequestID } as any,
    include: { booking: true }
  });

  if (!payment) {
    console.error('Payment not found for CheckoutRequestID:', CheckoutRequestID);
    return res.status(404).json({ error: 'Payment not found' });
  }

  // ResultCode 0 = Success
  if (ResultCode === 0) {
    const callbackMetadata = Body.stkCallback.CallbackMetadata?.Item || [];
    const mpesaReceiptNumber = callbackMetadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
    const transactionDate = callbackMetadata.find((item: any) => item.Name === 'TransactionDate')?.Value;

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'COMPLETED',
        mpesaReceiptNumber,
        mpesaTransactionDate: transactionDate ? new Date(String(transactionDate)) : null,
        completedAt: new Date()
      } as any
    });

    // Booking already exists, just confirm it
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CONFIRMED' }
    });

    console.log('Payment successful:', mpesaReceiptNumber);
  } else {
    // Payment failed - cancel booking
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' }
    });

    await cancelBooking(payment.bookingId);

    console.log('Payment failed:', ResultDesc);
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Check payment status by bookingId
export const checkPaymentStatus = asyncHandler(async (req: any, res: Response) => {
  const { bookingId } = req.params;

  const payment = await prisma.payment.findFirst({
    where: { bookingId },
    include: { booking: true }
  });

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({
    status: payment.status,              // ✅ Matches frontend
    paymentStatus: payment.status,       // Keep for clarity
    bookingStatus: payment.booking?.status,
    bookingId: payment.bookingId,
    paymentId: payment.id,
    amount: payment.amount
  });
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Create booking with slot reservation
async function createBookingFromPaymentData(params: {
  userId: string;
  salonId: string;
  salonServiceId: string;
  slotDate: string;
  slotStartTime: string;
  totalAmount: number;
  transactionFee: number;
  salonOwnerAmount: number;
  paymentMethod: string;
}) {
  const {
    userId,
    salonId,
    salonServiceId,
    slotDate,
    slotStartTime,
    totalAmount,
    transactionFee,
    salonOwnerAmount,
    paymentMethod
  } = params;

  // Fetch salon service
  const salonService = await prisma.salonService.findUnique({
    where: { id: salonServiceId },
    include: { service: true }
  });

  if (!salonService) throw new Error('SalonService not found');

  const slotDuration = 60;
  const requiredSlots = Math.ceil(salonService.duration / slotDuration);

  // Combine date + time
  const startSlot = DateTime.fromISO(`${slotDate}T${slotStartTime}`, {
    zone: 'Africa/Nairobi'
  }).toJSDate();

  // Find available slots
  const slots = await prisma.slot.findMany({
    where: {
      salonId,
      startTime: { gte: startSlot },
      isAvailable: true
    },
    orderBy: { startTime: 'asc' },
    take: requiredSlots
  });

  if (slots.length < requiredSlots) {
    throw new Error('Not enough consecutive slots available');
  }

  // Mark slots as booked
  const slotIds = slots.map(s => s.id);
  await prisma.slot.updateMany({
    where: { id: { in: slotIds } },
    data: { isAvailable: false }
  });

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      date: slots[0].date,
      startTime: slots[0].startTime,
      endTime: slots[slots.length - 1].endTime,
      salonId,
      salonServiceId,
      slotId: slotIds[0],
      status: 'CONFIRMED'
    }
  });

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: `BK-${Date.now()}`,
      totalAmount,
      transactionFee,
      salonOwnerAmount,
      status: paymentMethod === 'CASH' ? 'CONFIRMED' : 'PENDING_PAYMENT',
      paymentMethod,
      clientId: userId,
      salonId,
      salonServiceId,
      appointmentId: appointment.id,
      slotId: slotIds[0]
      // ✅ Removed slotDate and slotStartTime - not in schema
    } as any,
    include: {
      salonService: {
        include: { service: true }
      },
      salon: true,
      client: true
    }
  });

  return booking;
}

// Cancel booking and release slots
async function cancelBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { appointment: true }
  });

  if (!booking) return;

  // Update booking status
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' }
  });

  // Delete appointment
  if (booking.appointmentId) {
    await prisma.appointment.delete({
      where: { id: booking.appointmentId }
    });
  }

  // Release slots
  const slots = await prisma.slot.findMany({
    where: {
      salonId: booking.salonId,
      startTime: { 
        gte: DateTime.fromISO(`${booking.appointment.date}T${booking.appointment.startTime}`, {
          zone: 'Africa/Nairobi'
        }).toJSDate()
      },
      isAvailable: false
    },
    orderBy: { startTime: 'asc' }
  });

  const slotIds = slots.map(s => s.id);
  await prisma.slot.updateMany({
    where: { id: { in: slotIds } },
    data: { isAvailable: true }
  });
}