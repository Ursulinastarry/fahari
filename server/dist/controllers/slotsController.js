import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
import { DateTime } from 'luxon';
export const createSlot = asyncHandler(async (req, res) => {
    try {
        const { salonId, serviceId, date, startTime, endTime, isRecurring } = req.body;
        // Parse the date in EAT timezone
        const day = DateTime.fromISO(date, { zone: "Africa/Nairobi" }).startOf("day");
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
        const slot = await prisma.slot.create({
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
import { getSlotsService } from "../services/aiService.js";
export const getSlots = async (req, res) => {
    try {
        const slots = await getSlotsService(req.query);
        res.json(slots);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const getSalonSlots = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    const slots = await prisma.slot.findMany({
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
export const updateSlot = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const slot = await prisma.slot.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }
        if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this slot' });
        }
        const updatedSlot = await prisma.slot.update({
            where: { id },
            data: req.body
        });
        res.json(updatedSlot);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const deleteSlot = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const slot = await prisma.slot.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }
        if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this slot' });
        }
        await prisma.slot.delete({
            where: { id }
        });
        res.json({ message: 'Slot deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
