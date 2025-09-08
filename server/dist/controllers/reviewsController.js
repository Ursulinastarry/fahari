"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.updateReview = exports.getReviewsBySalon = exports.getBookingReview = exports.getOwnerReviews = exports.getReviews = exports.getSalonRating = exports.createReview = void 0;
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
const path_1 = __importDefault(require("path"));
exports.createReview = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { bookingId, rating, comment } = req.body;
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.user.id;
        const booking = await prisma_1.default.booking.findUnique({
            where: { id: bookingId },
            include: { review: true },
        });
        if (!booking)
            return res.status(404).json({ message: "Booking not found" });
        if (booking.clientId !== userId)
            return res.status(403).json({ message: "Not authorized to review this booking" });
        if (booking.review)
            return res.status(400).json({ message: "Review already exists for this booking" });
        // Handle uploaded files
        const imageFiles = req.files ? req.files.images : [];
        const imageArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles];
        const uploadedPaths = [];
        for (const file of imageArray) {
            const uploadPath = path_1.default.join(__dirname, "../uploads/", file.name);
            await file.mv(uploadPath);
            uploadedPaths.push(uploadPath);
        }
        const review = await prisma_1.default.review.create({
            data: {
                rating: Number(rating),
                comment,
                images: uploadedPaths,
                clientId: userId,
                salonId: booking.salonId,
                bookingId,
            },
        });
        // Update salon average rating
        const salonReviews = await prisma_1.default.review.findMany({ where: { salonId: booking.salonId } });
        const averageRating = salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length;
        await prisma_1.default.salon.update({
            where: { id: booking.salonId },
            data: { averageRating, totalReviews: salonReviews.length },
        });
        await prisma_1.default.booking.update({ where: { id: bookingId }, data: { status: "REVIEWED" } });
        res.status(201).json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getSalonRating = (0, asyncHandler_1.default)(async (req, res) => {
    const { salonId } = req.params;
    const reviews = await prisma_1.default.review.findMany({
        where: { salonId },
        select: { rating: true },
    });
    if (!reviews.length) {
        return res.json({ averageRating: 0, totalReviews: 0 });
    }
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    res.json({
        averageRating: parseFloat(averageRating.toFixed(1)), // e.g. 4.5
        totalReviews: reviews.length,
    });
});
exports.getReviews = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { salonId, clientId, rating } = req.query;
        const where = {};
        if (salonId)
            where.salonId = salonId;
        if (clientId)
            where.clientId = clientId;
        if (rating)
            where.rating = { gte: Number(rating) };
        const reviews = await prisma_1.default.review.findMany({
            where,
            include: {
                client: { select: { firstName: true, lastName: true, avatar: true } },
                salon: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getOwnerReviews = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        if (!ownerId) {
            return res.status(400).json({ message: "Owner ID is required" });
        }
        const reviews = await prisma_1.default.review.findMany({
            where: {
                salon: {
                    ownerId: ownerId,
                },
            },
            include: {
                client: { select: { firstName: true, lastName: true, avatar: true } },
                salon: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getBookingReview = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required" });
        }
        const review = await prisma_1.default.review.findUnique({
            where: { bookingId: bookingId },
            include: {
                client: { select: { firstName: true, lastName: true, avatar: true } },
                salon: { select: { name: true } }
            }
        });
        if (!review) {
            return res.status(404).json({ message: "Review not found for this booking" });
        }
        res.json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getReviewsBySalon = (0, asyncHandler_1.default)(async (req, res) => {
    const { salonId } = req.params;
    if (!salonId) {
        return res.status(400).json({ message: "Salon ID is required" });
    }
    const reviews = await prisma_1.default.review.findMany({
        where: {
            booking: {
                salonId: salonId, // filter by salon
            },
        },
        include: {
            client: {
                select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    res.json(reviews);
});
exports.updateReview = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, images } = req.body;
        const userId = req.user.userId;
        const review = await prisma_1.default.review.findUnique({
            where: { id }
        });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (review.clientId !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this review' });
        }
        const updatedReview = await prisma_1.default.review.update({
            where: { id },
            data: { rating, comment, images }
        });
        // Recalculate salon's average rating
        const salonReviews = await prisma_1.default.review.findMany({
            where: { salonId: review.salonId }
        });
        const averageRating = salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length;
        await prisma_1.default.salon.update({
            where: { id: review.salonId },
            data: { averageRating }
        });
        res.json(updatedReview);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteReview = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const review = await prisma_1.default.review.findUnique({
            where: { id }
        });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (review.clientId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this review' });
        }
        await prisma_1.default.review.delete({
            where: { id }
        });
        // Recalculate salon's average rating
        const salonReviews = await prisma_1.default.review.findMany({
            where: { salonId: review.salonId }
        });
        const averageRating = salonReviews.length > 0
            ? salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length
            : 0;
        await prisma_1.default.salon.update({
            where: { id: review.salonId },
            data: {
                averageRating,
                totalReviews: salonReviews.length
            }
        });
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
