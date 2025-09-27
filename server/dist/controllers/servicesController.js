"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerServices = exports.removeSalonService = exports.updateSalonService = exports.addSalonService = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler.js"));
const prisma_1 = __importDefault(require("../config/prisma.js"));
exports.addSalonService = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId, serviceId, price, duration } = req.body;
        const id = req.user.id;
        const role = req.user.role;
        const salon = await prisma_1.default.salon.findUnique({
            where: { id: salonId }
        });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }
        if (salon.ownerId !== id && role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to add services to this salon' });
        }
        const salonService = await prisma_1.default.salonService.create({
            data: {
                salonId,
                serviceId,
                price,
                duration
            },
            include: {
                service: true
            }
        });
        res.status(201).json(salonService);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateSalonService = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const { price, duration } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;
        const salonService = await prisma_1.default.salonService.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!salonService) {
            return res.status(404).json({ message: 'Salon service not found' });
        }
        if (salonService.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this salon service' });
        }
        const updatedSalonService = await prisma_1.default.salonService.update({
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
exports.removeSalonService = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const salonService = await prisma_1.default.salonService.findUnique({
            where: { id },
            include: { salon: true }
        });
        if (!salonService) {
            return res.status(404).json({ message: 'Salon service not found' });
        }
        if (salonService.salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to remove this salon service' });
        }
        await prisma_1.default.salonService.delete({
            where: { id }
        });
        res.json({ message: 'Salon service removed successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOwnerServices = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "SALON_OWNER" && req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden: only salon owners or admins can view this" });
    }
    const salons = await prisma_1.default.salon.findMany({
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
