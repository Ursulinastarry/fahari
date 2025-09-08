"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalon = exports.updateSalon = exports.getSalonServices = exports.getMySalon = exports.getSalon = exports.getSalons = exports.createSalon = void 0;
// At the top of your file
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const prisma = new client_1.PrismaClient();
const createSalon = async (req, res) => {
    try {
        const userId = req.user.id; // 🔥 make sure this matches protect
        const userRole = req.user.role;
        if (userRole !== "SALON_OWNER" && userRole !== "ADMIN") {
            return res.status(403).json({ message: "Only salon owners can create salons" });
        }
        const { name, description, email, phone, address, city, location, latitude, longitude, businessHours, profileImage, coverImage, gallery } = req.body;
        const salon = await prisma.salon.create({
            data: {
                name,
                description,
                email,
                phone,
                address,
                city,
                location,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                businessHours,
                profileImage,
                coverImage,
                gallery: gallery || [],
                owner: {
                    connect: { id: userId }
                }
            }
        });
        res.status(201).json(salon);
    }
    catch (error) {
        console.error("❌ Error creating salon:", error);
        res.status(500).json({ message: error.message });
    }
};
exports.createSalon = createSalon;
const getSalons = async (req, res) => {
    try {
        const { city, location, isActive = true, page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { isActive: Boolean(isActive) };
        if (city)
            where.city = city;
        if (location)
            where.location = { contains: location, mode: 'insensitive' };
        const salons = await prisma.salon.findMany({
            where,
            include: {
                owner: {
                    select: { firstName: true, lastName: true }
                },
                salonServices: {
                    include: { service: true }
                },
                reviews: {
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                }
            },
            skip,
            take: Number(limit),
            orderBy: { averageRating: 'desc' }
        });
        const total = await prisma.salon.count({ where });
        res.json({
            salons,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSalons = getSalons;
const getSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const salon = await prisma.salon.findUnique({
            where: { id },
            include: {
                owner: {
                    select: { firstName: true, lastName: true, email: true }
                },
                salonServices: {
                    include: { service: true }
                },
                reviews: {
                    include: {
                        client: {
                            select: { firstName: true, lastName: true, avatar: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                slots: {
                    where: {
                        date: { gte: new Date() },
                        isAvailable: true
                    },
                    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
                }
            }
        });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }
        res.json(salon);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSalon = getSalon;
const getMySalon = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Fetch salons where ownerId = logged-in user's id
    const { rows } = await index_1.pool.query(`SELECT id, name, description, email, phone, address, city, location, latitude, longitude,
            "businessHours", "isActive", "isVerified", "averageRating", "totalReviews",
            "profileImage", "coverImage", gallery, "createdAt", "updatedAt"
     FROM salons
     WHERE "ownerId" = $1`, [req.user.id]);
    if (!rows.length) {
        return res.status(404).json({ message: "No salon found for this owner" });
    }
    res.json(rows);
};
exports.getMySalon = getMySalon;
const getSalonServices = async (req, res) => {
    const { salonId } = req.params;
    if (!salonId) {
        return res.status(400).json({ message: "Salon ID is required" });
    }
    const services = await prisma.salonService.findMany({
        where: { salonId },
        include: {
            service: true, // brings in full service details
        },
    });
    if (!services.length) {
        return res.status(404).json({ message: "No services found for this salon" });
    }
    res.json(services);
};
exports.getSalonServices = getSalonServices;
const updateSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const salon = await prisma.salon.findUnique({
            where: { id }
        });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }
        if (salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to update this salon' });
        }
        const updatedSalon = await prisma.salon.update({
            where: { id },
            data: req.body
        });
        res.json(updatedSalon);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateSalon = updateSalon;
const deleteSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const salon = await prisma.salon.findUnique({
            where: { id }
        });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }
        if (salon.ownerId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this salon' });
        }
        await prisma.salon.delete({
            where: { id }
        });
        res.json({ message: 'Salon deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteSalon = deleteSalon;
function asyncHandler(arg0) {
    throw new Error("Function not implemented.");
}
