"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchServices = exports.searchSalons = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.searchSalons = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { query, city, location, service, minRating, maxPrice, sortBy = 'rating', page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { isActive: true };
        // Text search
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { location: { contains: query, mode: 'insensitive' } }
            ];
        }
        // Location filters
        if (city)
            where.city = city;
        if (location)
            where.location = { contains: location, mode: 'insensitive' };
        // Rating filter
        if (minRating)
            where.averageRating = { gte: Number(minRating) };
        // Service filter
        if (service) {
            where.salonServices = {
                some: {
                    service: {
                        OR: [
                            { name: { contains: service, mode: 'insensitive' } },
                            { category: { contains: service, mode: 'insensitive' } }
                        ]
                    },
                    ...(maxPrice && { price: { lte: Number(maxPrice) } })
                }
            };
        }
        // Sorting
        const orderBy = {};
        switch (sortBy) {
            case 'rating':
                orderBy.averageRating = 'desc';
                break;
            case 'reviews':
                orderBy.totalReviews = 'desc';
                break;
            case 'newest':
                orderBy.createdAt = 'desc';
                break;
            case 'name':
                orderBy.name = 'asc';
                break;
            default:
                orderBy.averageRating = 'desc';
        }
        const salons = await prisma_1.default.salon.findMany({
            where,
            include: {
                owner: { select: { firstName: true, lastName: true } },
                salonServices: {
                    include: { service: true },
                    orderBy: { price: 'asc' }
                },
                reviews: {
                    take: 3,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: { select: { firstName: true, lastName: true } }
                    }
                }
            },
            orderBy,
            skip,
            take: Number(limit)
        });
        const total = await prisma_1.default.salon.count({ where });
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
});
exports.searchServices = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { query, category, city, maxPrice } = req.query;
        const where = { isActive: true };
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } }
            ];
        }
        if (category)
            where.category = category;
        const services = await prisma_1.default.service.findMany({
            where,
            include: {
                salonServices: {
                    where: {
                        salon: {
                            isActive: true,
                            ...(city && { city: city })
                        },
                        ...(maxPrice && { price: { lte: Number(maxPrice) } })
                    },
                    include: {
                        salon: {
                            select: {
                                id: true,
                                name: true,
                                city: true,
                                location: true,
                                averageRating: true
                            }
                        }
                    },
                    orderBy: { price: 'asc' }
                }
            }
        });
        // Filter out services with no available salons
        const filteredServices = services.filter(service => service.salonServices.length > 0);
        res.json(filteredServices);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
