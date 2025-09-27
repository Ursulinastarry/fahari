import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
export const addSalonService = asyncHandler(async (req, res) => {
    const { serviceId, price, duration } = req.body;
    const userId = req.user.userId;
    // Find the salon belonging to this owner
    const salon = await prisma.salon.findFirst({
        where: { ownerId: userId },
    });
    if (!salon) {
        return res.status(404).json({ message: "Salon not found for this owner" });
    }
    const salonService = await prisma.salonService.create({
        data: {
            serviceId,
            salonId: salon.id, // automatically bound to owner’s salon
            price,
            duration,
        },
        include: { service: true },
    });
    res.status(201).json(salonService);
});
export const updateSalonService = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { price, duration } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const salonService = await prisma.salonService.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!salonService) {
            return res.status(404).json({ message: 'Salon service not found' });
        }
        if (salonService.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this salon service' });
        }
        const updatedSalonService = await prisma.salonService.update({
            where: { id },
            data: { price, duration },
            include: { service: true }
        });
        res.json(updatedSalonService);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const removeSalonService = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const salonService = await prisma.salonService.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!salonService) {
            return res.status(404).json({ message: 'Salon service not found' });
        }
        if (salonService.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to remove this salon service' });
        }
        await prisma.salonService.delete({
            where: { id }
        });
        res.json({ message: 'Salon service removed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const getOwnerServices = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden: only salon owners or admins can view this" });
    }
    const salons = await prisma.salon.findMany({
        where: { ownerId: req.user.id },
        include: {
            salonServices: {
                include: { service: true },
            },
        },
    });
    if (!salons.length) {
        return res.status(404).json({ message: "No salons found for this owner" });
    }
    // Normalize shape for frontend
    const services = salons.flatMap((salon) => salon.salonServices.map((ss) => ({
        id: ss.id, // 👈 salonService id
        price: ss.price,
        duration: ss.duration,
        service: {
            id: ss.service.id, // base service id
            name: ss.service.name, // base service name
            active: ss.service.isActive,
        },
    })));
    res.json(services);
});
export const getSalonServices = async (req, res) => {
    try {
        const { salonId } = req.params;
        if (!salonId) {
            return res.status(400).json({ message: "Salon ID is required" });
        }
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            include: { salonServices: { include: { service: true } } }, // assuming relation: Salon -> Services
        });
        if (!salon) {
            return res.status(404).json({ message: "Salon not found" });
        }
        return res.json(salon.salonServices);
    }
    catch (error) {
        console.error("Error fetching salon services:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
