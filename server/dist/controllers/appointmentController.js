import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
export const createAppointment = asyncHandler(async (req, res) => {
    try {
        const { salonId, salonServiceId, slotId, notes } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        // Check if slot exists and is available
        const slot = await prisma.slot.findUnique({
            where: { id: slotId },
            include: { salon: true, service: true }
        });
        if (!slot || !slot.isAvailable) {
            return res.status(400).json({ message: 'Slot not available' });
        }
        // Only salon owner or admin can create appointments directly
        if (slot.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to create appointments for this salon' });
        }
        const appointment = await prisma.appointment.create({
            data: {
                date: slot.date,
                startTime: slot.startTime,
                endTime: slot.endTime,
                salonId,
                salonServiceId,
                slotId,
                notes
            },
            include: {
                salon: { select: { name: true } },
                salonService: { select: { service: { select: { name: true, category: true } } } },
                slot: true
            }
        });
        // Mark slot as unavailable
        await prisma.slot.update({
            where: { id: slotId },
            data: { isAvailable: false }
        });
        res.status(201).json(appointment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const getAppointments = asyncHandler(async (req, res) => {
    try {
        const { salonId, status, date } = req.query;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const where = {};
        if (status)
            where.status = status;
        if (date)
            where.date = new Date(date);
        // Filter by salon ownership for salon owners
        if (userRole === 'SALON_OWNER') {
            const ownedSalons = await prisma.salon.findMany({
                where: { ownerId: userId },
                select: { id: true }
            });
            where.salonId = { in: ownedSalons.map((s) => s.id) };
        }
        else if (salonId && userRole === 'ADMIN') {
            where.salonId = salonId;
        }
        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                salon: { select: { name: true } },
                salonService: { select: { service: { select: { name: true, category: true } } } },
                booking: {
                    include: {
                        client: { select: { firstName: true, lastName: true, phone: true } }
                    }
                }
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
        });
        res.json(appointments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const updateAppointment = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        if (appointment.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this appointment' });
        }
        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: { status, notes }
        });
        res.json(updatedAppointment);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
