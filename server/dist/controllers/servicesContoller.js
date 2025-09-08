"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteService = exports.getAllServices = exports.updateService = exports.createService = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.createService = (0, asyncHandler_1.default)(async (req, res) => {
    const { name, description, category, isActive } = req.body;
    if (!name) {
        return res.status(400).json({ message: "Service name is required" });
    }
    const exists = await prisma_1.default.service.findFirst({ where: { name } });
    if (exists) {
        return res.status(400).json({ message: "Service already exists" });
    }
    const service = await prisma_1.default.service.create({
        data: {
            name,
            description,
            category,
            isActive: isActive ?? true,
        },
    });
    res.status(201).json(service);
});
exports.updateService = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { name, description, category, isActive } = req.body;
    const service = await prisma_1.default.service.findUnique({ where: { id } });
    if (!service) {
        return res.status(404).json({ message: "Service not found" });
    }
    const updated = await prisma_1.default.service.update({
        where: { id },
        data: {
            name: name ?? service.name,
            description: description ?? service.description,
            category: category ?? service.category,
            isActive: isActive ?? service.isActive,
        },
    });
    res.json(updated);
});
exports.getAllServices = (0, asyncHandler_1.default)(async (req, res) => {
    const services = await prisma_1.default.service.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    });
    res.json(services);
});
exports.deleteService = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const role = req.user.role;
    if (role !== "ADMIN") {
        return res.status(403).json({ message: "Only admins can delete base services" });
    }
    const service = await prisma_1.default.service.findUnique({ where: { id } });
    if (!service) {
        return res.status(404).json({ message: "Service not found" });
    }
    // If you want cascade delete of salonServices, add: `await prisma.salonService.deleteMany({ where: { serviceId: id } });`
    await prisma_1.default.service.delete({ where: { id } });
    res.json({ message: "Service deleted successfully" });
});
