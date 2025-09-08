"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSlot = exports.updateSlot = exports.getSalonSlots = exports.getSlots = exports.createSlot = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
const luxon_1 = require("luxon");
exports.createSlot = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId, serviceId, date, startTime, endTime, isRecurring } = req.body;
        // Parse the date in EAT timezone
        const day = luxon_1.DateTime.fromISO(date, { zone: "Africa/Nairobi" }).startOf("day");
        // Combine day + startTime/endTime in EAT
        const start = day.plus({
            hours: Number(startTime.split(":")[0]),
            minutes: Number(startTime.split(":")[1] || 0),
        }).toJSDate();
        const end = day.plus({
            hours: Number(endTime.split(":")[0]),
            minutes: Number(endTime.split(":")[1] || 0),
        }).toJSDate();
        console.log("DEBUG start:", start, "end:", end);
        const slot = await prisma_1.default.slot.create({
            data: {
                salonId,
                serviceId,
                date: day.toJSDate(), // store only the day
                startTime: start, // full datetime
                endTime: end, // full datetime
                isRecurring: Boolean(isRecurring),
                isAvailable: true,
            },
        });
        res.status(201).json(slot);
    }
    catch (err) {
        console.error("Error creating slot:", err);
        res.status(500).json({ error: "Failed to create slot" });
    }
});
exports.getSlots = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId, date, serviceId, isAvailable } = req.query;
        const where = {};
        if (salonId)
            where.salonId = salonId;
        if (date)
            where.date = new Date(date);
        if (serviceId)
            where.serviceId = serviceId;
        if (isAvailable !== undefined)
            where.isAvailable = Boolean(isAvailable);
        const slots = await prisma_1.default.slot.findMany({
            where,
            include: {
                salon: {
                    select: { name: true }
                },
                service: {
                    select: { name: true, category: true }
                }
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        });
        res.json(slots);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSalonSlots = (0, asyncHandler_1.default)(async (req, res) => {
    const { salonId } = req.params;
    const slots = await prisma_1.default.slot.findMany({
        where: { salonId },
        orderBy: { startTime: "asc" },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
            serviceId: true,
        },
    });
    res.json(slots);
});
exports.updateSlot = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const slot = await prisma_1.default.slot.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }
        if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this slot' });
        }
        const updatedSlot = await prisma_1.default.slot.update({
            where: { id },
            data: req.body
        });
        res.json(updatedSlot);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteSlot = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const slot = await prisma_1.default.slot.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }
        if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this slot' });
        }
        await prisma_1.default.slot.delete({
            where: { id }
        });
        res.json({ message: 'Slot deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
