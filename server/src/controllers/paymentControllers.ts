import { Response } from 'express';
import  asyncHandler  from '../middlewares/asyncHandler';
import prisma  from '../config/prisma';
import { mpesaService } from '../services/mpesaService';
import { DateTime } from 'luxon';
const TRANSACTION_FEE_PERCENTAGE = 0.02; // 2%

// Initiate payment
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

  // Create pending booking record
  const booking = await prisma.booking.create({
    data: {
      bookingNumber: `BK-${Date.now()}`,
      totalAmount: totalAmount,
      transactionFee: transactionFee,
      salonOwnerAmount: salonOwnerAmount,
      status: 'PENDING_PAYMENT',
      paymentMethod: paymentMethod,
      clientId: req.user.id,
      salonId,
      salonServiceId,
      slotDate,
      slotStartTime,
      // Don't mark slots yet - wait for payment
    } as any
  });

  // Handle M-Pesa payment
  if (paymentMethod === 'MPESA') {
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required for M-Pesa' });
    }

    try {
      const stkResponse = await mpesaService.initiateSTKPush(
        phoneNumber,
        totalAmount,
        booking.bookingNumber,
        `Payment for ${salonService.service.name}`
      );

      // Save M-Pesa transaction
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalAmount,
          paymentMethod: 'MPESA',
          status: 'PENDING',
          mpesaCheckoutRequestId: stkResponse.CheckoutRequestID,
          mpesaMerchantRequestId: stkResponse.MerchantRequestID,
        } as any
      });

      return res.status(200).json({
        success: true,
        message: 'Payment initiated. Please complete on your phone.',
        bookingId: booking.id,
        checkoutRequestId: stkResponse.CheckoutRequestID,
        amount: totalAmount,
        transactionFee: transactionFee
      });
    } catch (error: any) {
      console.error('M-Pesa error:', error);
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' }
      });
      return res.status(500).json({ 
        error: 'Payment initiation failed',
        details: error.response?.data || error.message 
      });
    }
  }

  // Handle Cash payment
  if (paymentMethod === 'CASH') {
    // For cash, we confirm booking but mark payment as cash on delivery
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: totalAmount,
        paymentMethod: 'CASH',
        status: 'PENDING', // Will be confirmed when client arrives
      } as any
    });

    // Update booking status and mark slots
    await completeBooking(booking.id);

    return res.status(200).json({
      success: true,
      message: 'Booking confirmed. Pay cash at the salon.',
      bookingId: booking.id,
      amount: totalAmount,
      transactionFee: transactionFee,
      note: 'Transaction fee will be added to salon owner account'
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
    where: ({ mpesaCheckoutRequestId: CheckoutRequestID } as any),
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

    // Complete the booking
    await completeBooking(payment.bookingId);

    console.log('Payment successful:', mpesaReceiptNumber);
  } else {
    // Payment failed
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' }
    });

    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: 'CANCELLED' }
    });

    console.log('Payment failed:', ResultDesc);
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// Check payment status
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
    status: payment.status,
    bookingStatus: payment.booking.status,
    amount: payment.amount
  });
});

// Helper: Complete booking after successful payment
async function completeBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { salonService: { include: { service: true } }, slot:true,salon: true, client: true }
  });

  if (!booking) throw new Error('Booking not found');

  const slotDuration = 60;
  const requiredSlots = Math.ceil(booking.salonService!.duration / slotDuration);
  const startSlot = DateTime.fromISO(`${booking.slot.date}T${booking.slot.startTime}`, { 
    zone: 'Africa/Nairobi' 
  }).toJSDate();

  // Find and mark slots as unavailable
  const slots = await prisma.slot.findMany({
    where: {
      salonId: booking.salonId,
      startTime: { gte: startSlot },
      isAvailable: true
    },
    orderBy: { startTime: 'asc' },
    take: requiredSlots
  });

  if (slots.length < requiredSlots) {
    throw new Error('Not enough consecutive slots available');
  }

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
      salonId: booking.salonId,
      salonServiceId: booking.salonServiceId,
      slotId: slotIds[0],
      status: 'CONFIRMED'
    }
  });

  // Update booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      appointmentId: appointment.id,
      slotId: slotIds[0]
    }
  });

  // Add transaction fee to salon owner's account (for cash payments)
  if ((booking as any).paymentMethod === 'CASH') {
    await (prisma as any).salonOwnerBalance.upsert({
      where: { ownerId: booking.salon.ownerId },
      update: {
        pendingAmount: { increment: (booking as any).transactionFee }
      },
      create: {
        ownerId: booking.salon.ownerId,
        pendingAmount: (booking as any).transactionFee,
        availableAmount: 0
      }
    });
  }

  // Send notifications (reuse your existing function)
  // await createAndSendNotification(...);
}