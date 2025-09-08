"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformStatistics = exports.getSalonStatistics = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.getSalonStatistics = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId } = req.params;
        const { startDate, endDate } = req.query;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const salon = await prisma_1.default.salon.findUnique({
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
        const statistics = await prisma_1.default.salonStatistic.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        res.json(statistics);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPlatformStatistics = (0, asyncHandler_1.default)(async (req, res) => {
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
        const statistics = await prisma_1.default.platformStatistic.findMany({
            where,
            orderBy: { date: 'desc' }
        });
        res.json(statistics);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
