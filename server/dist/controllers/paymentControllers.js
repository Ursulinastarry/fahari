"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePaymentStatus = exports.createPayment = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.createPayment = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { bookingId, amount, method, transactionId, mpesaReceiptNumber } = req.body;
        const userId = req.user.userId;
        const booking = await prisma_1.default.booking.findUnique({
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
        const payment = await prisma_1.default.payment.create({
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updatePaymentStatus = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const { status, failureReason } = req.body;
        const userRole = req.user.role;
        // Only admin or system can update payment status
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update payment status' });
        }
        const payment = await prisma_1.default.payment.update({
            where: { id },
            data: {
                status,
                failureReason,
                processedAt: status === 'COMPLETED' ? new Date() : undefined
            }
        });
        // If payment is completed, update booking status
        if (status === 'COMPLETED') {
            await prisma_1.default.booking.update({
                where: { id: payment.bookingId },
                data: { status: 'CONFIRMED' }
            });
            await prisma_1.default.appointment.update({
                where: { id: (await prisma_1.default.booking.findUnique({
                        where: { id: payment.bookingId }
                    }))?.appointmentId },
                data: { status: 'CONFIRMED' }
            });
        }
        res.json(payment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
