"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSalon = exports.deleteFileIfExists = exports.updateSalon = exports.getSalonServices = exports.getMySalon = exports.getSalon = exports.getSalons = exports.createSalon = exports.uploadSalonMedia = void 0;
// At the top of your file
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/salons/'); // Make sure this directory exists
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(null, false);
        }
    }
});
exports.uploadSalonMedia = (0, multer_1.default)({ storage });
const prisma = new client_1.PrismaClient();
const createSalon = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        if (userRole !== "SALON_OWNER" && userRole !== "ADMIN") {
            return res.status(403).json({ message: "Only salon owners can create salons" });
        }
        // With FormData, text fields come through req.body
        const { name, description, email, phone, address, city, location, businessHours // This is a JSON string from FormData
         } = req.body;
        // Parse businessHours since it comes as JSON string
        let parsedBusinessHours = {};
        if (businessHours) {
            try {
                parsedBusinessHours = JSON.parse(businessHours);
            }
            catch (e) {
                return res.status(400).json({ message: "Invalid businessHours format" });
            }
        }
        // Files come through req.files (handled by multer)
        const files = req.files;
        const profileImage = files?.profileImage?.[0]?.filename || null;
        const coverImage = files?.coverImage?.[0]?.filename || null;
        const gallery = files?.gallery?.map(file => file.filename) || [];
        const salon = await prisma.salon.create({
            data: {
                name,
                description,
                email,
                phone,
                address,
                city,
                location,
                businessHours: parsedBusinessHours,
                profileImage,
                coverImage,
                gallery,
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
        const userId = req.user.id;
        const userRole = req.user.role;
        // Find existing salon
        const salon = await prisma.salon.findUnique({
            where: { id },
        });
        if (!salon) {
            return res.status(404).json({ message: "Salon not found" });
        }
        if (salon.ownerId !== userId && userRole !== "ADMIN") {
            return res.status(403).json({ message: "Not authorized to update this salon" });
        }
        // Extract text fields
        const { name, description, email, phone, address, city, location, businessHours, } = req.body;
        // Handle uploaded files
        const files = req.files;
        // Initialize with existing values
        let profileImage = salon.profileImage;
        let coverImage = salon.coverImage;
        let gallery = salon.gallery || [];
        // Handle profile image update
        if (files?.profileImage?.[0]) {
            const newProfileImage = files.profileImage[0].filename;
            // Delete old profile image if it exists
            if (salon.profileImage) {
                (0, exports.deleteFileIfExists)(path_1.default.join(__dirname, "../../uploads/salons", salon.profileImage));
            }
            profileImage = newProfileImage;
        }
        // Handle cover image update
        if (files?.coverImage?.[0]) {
            const newCoverImage = files.coverImage[0].filename;
            // Delete old cover image if it exists
            if (salon.coverImage) {
                (0, exports.deleteFileIfExists)(path_1.default.join(__dirname, "../../uploads/salons", salon.coverImage));
            }
            coverImage = newCoverImage;
        }
        // Handle gallery images update
        if (files?.gallery && files.gallery.length > 0) {
            const newGalleryFiles = files.gallery.map((file) => file.filename);
            // Delete old gallery images if they exist
            if (salon.gallery && salon.gallery.length > 0) {
                salon.gallery.forEach((oldFile) => {
                    (0, exports.deleteFileIfExists)(path_1.default.join(__dirname, "../../uploads/salons", oldFile));
                });
            }
            gallery = newGalleryFiles;
        }
        // Update salon in database
        const updatedSalon = await prisma.salon.update({
            where: { id },
            data: {
                name: name || salon.name,
                description: description || salon.description,
                email: email || salon.email,
                phone: phone || salon.phone,
                address: address || salon.address,
                city: city || salon.city,
                location: location || salon.location,
                businessHours: businessHours || salon.businessHours,
                profileImage,
                coverImage,
                gallery,
            },
        });
        res.json(updatedSalon);
    }
    catch (error) {
        console.error("Error updating salon:", error);
        res.status(500).json({ message: error.message });
    }
};
exports.updateSalon = updateSalon;
// Helper function to safely delete files
const deleteFileIfExists = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`Deleted old file: ${filePath}`);
        }
    }
    catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
    }
};
exports.deleteFileIfExists = deleteFileIfExists;
const deleteSalon = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
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
