"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markReminderAsSent = exports.getReminders = exports.createReminder = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.createReminder = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { bookingId, type, scheduledFor, message, channel } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: { salon: true }
        });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        // Only salon owner or admin can create reminders
        if (booking.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to create reminders for this booking' });
        }
        const reminder = await prisma_1.default.reminder.create({
            data: {
                bookingId,
                type,
                scheduledFor: new Date(scheduledFor),
                message,
                channel
            }
        });
        res.status(201).json(reminder);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getReminders = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { bookingId, sent } = req.query;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const where = {};
        if (bookingId)
            where.bookingId = bookingId;
        if (sent !== undefined) {
            where.sentAt = sent === 'true' ? { not: null } : null;
        }
        // Filter by user's bookings or owned salons
        if (userRole === 'CLIENT') {
            const clientBookings = await prisma_1.default.booking.findMany({
                where: { clientId: userId },
                select: { id: true }
            });
            where.bookingId = { in: clientBookings.map(b => b.id) };
        }
        else if (userRole === 'SALON_OWNER') {
            const ownedSalons = await prisma_1.default.salon.findMany({
                where: { ownerId: userId },
                select: { id: true }
            });
            const salonBookings = await prisma_1.default.booking.findMany({
                where: { salonId: { in: ownedSalons.map(s => s.id) } },
                select: { id: true }
            });
            where.bookingId = { in: salonBookings.map(b => b.id) };
        }
        const reminders = await prisma_1.default.reminder.findMany({
            where,
            include: {
                booking: {
                    include: {
                        client: { select: { firstName: true, lastName: true } },
                        salon: { select: { name: true } }
                    }
                }
            },
            orderBy: { scheduledFor: 'asc' }
        });
        res.json(reminders);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.markReminderAsSent = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can mark reminders as sent' });
        }
        const reminder = await prisma_1.default.reminder.update({
            where: { id },
            data: { sentAt: new Date() }
        });
        res.json(reminder);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
