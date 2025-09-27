import asyncHandler from "../middlewares/asyncHandler";
import prisma from "../config/prisma";
export const getSalonStatistics = asyncHandler(async (req, res) => {
    try {
        const { salonId } = req.params;
        const { startDate, endDate } = req.query;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const salon = await prisma.salon.findUnique({
            where: { id: salonId }
        });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }
        if (salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to view statistics for this salon' });
        }
        const where = { salonId };
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const statistics = await prisma.salonStatistic.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        res.json(statistics);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const getPlatformStatistics = asyncHandler(async (req, res) => {
    try {
        const userRole = req.user.role;
        if (userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Only admins can view platform statistics' });
        }
        const { startDate, endDate } = req.query;
        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        const statistics = await prisma.platformStatistic.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        res.json(statistics);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
