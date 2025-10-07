import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
import { getSalonServicesService, getOwnerServicesService } from "../services/aiService.js";
export const addSalonService = asyncHandler(async (req, res) => {
    const { serviceId, price, duration } = req.body;
    const { salonId } = req.params; // Get from URL
    const userId = req.user.userId;
    // Verify the salon belongs to this owner
    const salon = await prisma.salon.findFirst({
        where: {
            id: salonId,
            ownerId: userId, // Ensure ownership
        },
    });
    if (!salon) {
        return res.status(404).json({
            message: "Salon not found or you don't have permission to modify it"
        });
    }
    // Check if this service already exists for this salon
    const existingService = await prisma.salonService.findUnique({
        where: {
            salonId_serviceId: {
                salonId: salon.id,
                serviceId: serviceId,
            },
        },
    });
    if (existingService) {
        return res.status(409).json({
            message: "This service already exists for this salon"
        });
    }
    const salonService = await prisma.salonService.create({
        data: {
            serviceId,
            salonId: salon.id,
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
    const services = await getOwnerServicesService(req.user.id);
    if (!services.length) {
        return res.status(404).json({ message: "No services found for this owner" });
    }
    res.json(services);
});
export const getSalonServices = async (req, res) => {
    try {
        const { salonId } = req.params;
        const services = await getSalonServicesService(salonId);
        res.json(services);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
