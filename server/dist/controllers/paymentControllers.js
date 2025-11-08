import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
import { mpesaService } from "../services/mpesaService.js";
import { DateTime } from "luxon";
const TRANSACTION_FEE_PERCENTAGE = 0.02; // 2%
// ======================================================================================
// INITIATE PAYMENT
// ======================================================================================
export const initiatePayment = asyncHandler(async (req, res) => {
    const { salonId, salonServiceId, slotDate, slotStartTime, phoneNumber, paymentMethod } = req.body;
    if (!req.user)
        return res.status(401).json({ error: "Unauthorized" });
    if (!["MPESA", "CASH"].includes(paymentMethod)) {
        return res.status(400).json({ error: "Invalid payment method" });
    }
    // Fetch salon service for amount calculation
    const salonService = await prisma.salonService.findUnique({
        where: { id: salonServiceId },
        include: { service: true, salon: true },
    });
    if (!salonService)
        return res.status(404).json({ error: "Service not found" });
    const baseAmount = salonService.price;
    const transactionFee = Math.ceil(baseAmount * TRANSACTION_FEE_PERCENTAGE);
    const totalAmount = baseAmount + transactionFee;
    // ✅ Create booking using existing controller logic
    // (We just call its internal logic manually; it can also be refactored into a shared service)
    const booking = await prisma.$transaction(async (tx) => {
        const slotDuration = 60;
        const requiredSlots = Math.ceil(salonService.duration / slotDuration);
        const startSlot = DateTime.fromISO(`${slotDate}T${slotStartTime}`, {
            zone: "Africa/Nairobi",
        }).toJSDate();
        const slots = await tx.slot.findMany({
            where: { salonId, startTime: { gte: startSlot }, isAvailable: true },
            orderBy: { startTime: "asc" },
            take: requiredSlots,
        });
        if (slots.length < requiredSlots) {
            throw new Error("Not enough consecutive slots available");
        }
        const slotIds = slots.map((s) => s.id);
        await tx.slot.updateMany({ where: { id: { in: slotIds } }, data: { isAvailable: false } });
        const appointment = await tx.appointment.create({
            data: {
                date: slots[0].date,
                startTime: slots[0].startTime,
                endTime: slots[slots.length - 1].endTime,
                salonId,
                salonServiceId,
                slotId: slotIds[0],
                status: "CONFIRMED",
            },
        });
        return await tx.booking.create({
            data: {
                bookingNumber: `BK-${Date.now()}`,
                totalAmount,
                transactionFee,
                salonOwnerAmount: baseAmount,
                status: paymentMethod === "CASH" ? "CONFIRMED" : "PENDING_PAYMENT",
                paymentMethod,
                clientId: req.user.id,
                salonId,
                salonServiceId,
                appointmentId: appointment.id,
                slotId: slotIds[0],
            },
            include: { salon: true, salonService: { include: { service: true } } },
        });
    });
    // ✅ Create pending payment record
    const payment = await prisma.payment.create({
        data: {
            bookingId: booking.id,
            amount: totalAmount,
            method: paymentMethod,
            status: "PENDING",
        },
    });
    // ======================================================================================
    // PAYMENT LOGIC
    // ======================================================================================
    if (paymentMethod === "MPESA") {
        if (!phoneNumber) {
            await cancelBookingDirect(booking.id);
            return res.status(400).json({ error: "Phone number required for M-Pesa" });
        }
        try {
            const stkResponse = await mpesaService.initiateSTKPush(phoneNumber, totalAmount, booking.bookingNumber, `Payment for ${salonService.service.name}`);
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    mpesaCheckoutRequestId: stkResponse.CheckoutRequestID,
                    mpesaMerchantRequestId: stkResponse.MerchantRequestID,
                },
            });
            return res.status(200).json({
                success: true,
                message: "Payment initiated. Please complete on your phone.",
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                paymentId: payment.id,
                checkoutRequestId: stkResponse.CheckoutRequestID,
                amount: totalAmount,
                transactionFee,
            });
        }
        catch (error) {
            console.error("M-Pesa error:", error);
            await cancelBookingDirect(booking.id);
            return res.status(500).json({
                error: "Payment initiation failed",
                details: error.response?.data || error.message,
            });
        }
    }
    // CASH Payment
    return res.status(200).json({
        success: true,
        message: "Booking confirmed. Pay cash at the salon.",
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        paymentId: payment.id,
        amount: totalAmount,
        transactionFee,
    });
});
// ======================================================================================
// M-PESA CALLBACK
// ======================================================================================
export const mpesaCallback = asyncHandler(async (req, res) => {
    const { Body } = req.body;
    if (!Body || !Body.stkCallback)
        return res.status(400).json({ error: "Invalid callback data" });
    const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;
    const payment = await prisma.payment.findFirst({
        where: { mpesaCheckoutRequestId: CheckoutRequestID },
        include: { booking: true },
    });
    if (!payment) {
        console.error("Payment not found:", CheckoutRequestID);
        return res.status(404).json({ error: "Payment not found" });
    }
    if (ResultCode === 0) {
        const metadata = Body.stkCallback.CallbackMetadata?.Item || [];
        const mpesaReceiptNumber = metadata.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
        const transactionDate = metadata.find((i) => i.Name === "TransactionDate")?.Value;
        const rawDate = metadata.find((item) => item.Name === 'TransactionDate')?.Value;
        let parsedDate = null;
        if (rawDate && typeof rawDate === 'number') {
            const str = String(rawDate);
            const year = parseInt(str.slice(0, 4));
            const month = parseInt(str.slice(4, 6)) - 1; // JS months = 0–11
            const day = parseInt(str.slice(6, 8));
            const hour = parseInt(str.slice(8, 10));
            const minute = parseInt(str.slice(10, 12));
            const second = parseInt(str.slice(12, 14));
            parsedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
        }
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: "COMPLETED",
                mpesaReceiptNumber,
                mpesaTransactionDate: parsedDate,
                processedAt: new Date(),
            },
        });
        await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: "CONFIRMED" },
        });
        console.log("Payment successful:", mpesaReceiptNumber);
    }
    else {
        await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
        });
        await cancelBookingDirect(payment.bookingId);
        console.log("Payment failed:", ResultDesc);
    }
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});
// ======================================================================================
// PAYMENT STATUS CHECK
// ======================================================================================
export const checkPaymentStatus = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const payment = await prisma.payment.findFirst({
        where: { bookingId },
        include: { booking: true },
    });
    if (!payment)
        return res.status(404).json({ error: "Payment not found" });
    res.json({
        status: payment.status,
        bookingStatus: payment.booking?.status,
        amount: payment.amount,
    });
});
// ======================================================================================
// SIMPLE HELPER FOR DIRECT CANCELLATION (without req/res)
// ======================================================================================
async function cancelBookingDirect(bookingId) {
    // load booking with related slot and appointmentId so we can restore slots and cancel appointment
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { slot: true },
    });
    if (!booking)
        return;
    await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
    });
    // appointment is linked via booking.appointmentId (set when booking was created)
    if (booking.appointmentId) {
        await prisma.appointment.updateMany({
            where: { id: booking.appointmentId },
            data: { status: "CANCELLED" },
        });
    }
    // restore slot availability for the time range of the original slot (if present)
    if (booking.slot) {
        await prisma.slot.updateMany({
            where: {
                salonId: booking.salonId,
                date: booking.slot.date, // same day
                startTime: {
                    gte: booking.slot.startTime,
                    lt: booking.slot.endTime ?? booking.slot.startTime, // ensure all slots within service duration
                },
            },
            data: { isAvailable: true },
        });
    }
}
