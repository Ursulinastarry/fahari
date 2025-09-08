"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromWaitlist = exports.getWaitlist = exports.addToWaitlist = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.addToWaitlist = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId, date, timeSlot } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        if (userRole !== 'CLIENT') {
            return res.status(403).json({ message: 'Only clients can join waitlist' });
        }
        const salon = await prisma_1.default.salon.findUnique({
            where: { id: salonId }
        });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }
        const waitlistEntry = await prisma_1.default.waitlistEntry.create({
            data: {
                clientId: userId,
                salonId,
                date: new Date(date),
                timeSlot
            }
        });
        res.status(201).json(waitlistEntry);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getWaitlist = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId, date } = req.query;
        const userId = req.user.userId;
        const userRole = req.user.role;
        // Only salon owners can view their salon's waitlist
        if (userRole === 'SALON_OWNER') {
            const salon = await prisma_1.default.salon.findFirst({
                where: { id: salonId, ownerId: userId }
            });
            if (!salon) {
                return res.status(403).json({ message: 'Not authorized to view this waitlist' });
            }
        }
        else if (userRole === 'CLIENT') {
            // Clients can only see their own waitlist entries
            const waitlistEntries = await prisma_1.default.waitlistEntry.findMany({
                where: {
                    clientId: userId,
                    ...(salonId && { salonId: salonId }),
                    ...(date && { date: new Date(date) })
                },
                include: {
                    salon: { select: { name: true } }
                },
                orderBy: [{ date: 'asc' }, { priority: 'desc' }]
            });
            return res.json(waitlistEntries);
        }
        else if (userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const where = {};
        if (salonId)
            where.salonId = salonId;
        if (date)
            where.date = new Date(date);
        const waitlistEntries = await prisma_1.default.waitlistEntry.findMany({
            where,
            include: {
                client: { select: { firstName: true, lastName: true, phone: true } },
                salon: { select: { name: true } }
            },
            orderBy: [{ date: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }]
        });
        res.json(waitlistEntries);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.removeFromWaitlist = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const waitlistEntry = await prisma_1.default.waitlistEntry.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!waitlistEntry) {
            return res.status(404).json({ message: 'Waitlist entry not found' });
        }
        // Client can remove themselves, salon owner can remove from their salon's waitlist
        const canRemove = waitlistEntry.clientId === userId ||
            waitlistEntry.salon.ownerId === userId ||
            userRole === 'ADMIN';
        if (!canRemove) {
            return res.status(403).json({ message: 'Not authorized to remove this waitlist entry' });
        }
        await prisma_1.default.waitlistEntry.delete({
            where: { id }
        });
        res.json({ message: 'Removed from waitlist successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
