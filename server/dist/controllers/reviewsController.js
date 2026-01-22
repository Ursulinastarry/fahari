import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
export const createReview = asyncHandler(async (req, res) => {
    try {
        console.log("---- Incoming Review Request ----");
        console.log("Body:", req.body);
        console.log("Files:", req.files);
        const { bookingId, rating, comment } = req.body;
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const userId = req.user.id;
        const booking = await prisma.booking.findUnique({
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
        let images = [];
        if (req.files) {
            const files = req.files;
            console.log("Uploaded files:", files);
            images = files.map(file => file.filename);
            console.log("Image filenames:", images);
        }
        const review = await prisma.review.create({
            data: {
                rating: Number(rating),
                comment,
                images,
                clientId: userId,
                salonId: booking.salonId,
                bookingId,
            },
        });
        // Update salon average rating
        const salonReviews = await prisma.review.findMany({ where: { salonId: booking.salonId } });
        const averageRating = salonReviews.length > 0
            ? salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length
            : 0;
        await prisma.salon.update({
            where: { id: booking.salonId },
            data: { averageRating, totalReviews: salonReviews.length },
        });
        // Set booking status to REVIEWED only after successful review creation and salon update
        await prisma.booking.update({ where: { id: bookingId }, data: { status: "REVIEWED" } });
        res.status(201).json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const getSalonRating = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    const reviews = await prisma.review.findMany({
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
export const getReviews = asyncHandler(async (req, res) => {
    try {
        const { salonId, clientId, rating } = req.query;
        const where = {};
        if (salonId)
            where.salonId = salonId;
        if (clientId)
            where.clientId = clientId;
        if (rating)
            where.rating = { gte: Number(rating) };
        const reviews = await prisma.review.findMany({
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
export const getOwnerReviews = asyncHandler(async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const ownerId = req.user.id;
        if (!ownerId) {
            return res.status(400).json({ message: "Owner ID is required" });
        }
        const reviews = await prisma.review.findMany({
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
export const getBookingReview = asyncHandler(async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!bookingId) {
            return res.status(400).json({ message: "Booking ID is required" });
        }
        const review = await prisma.review.findUnique({
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
export const getReviewsBySalon = asyncHandler(async (req, res) => {
    const { salonId } = req.params;
    if (!salonId) {
        return res.status(400).json({ message: "Salon ID is required" });
    }
    const reviews = await prisma.review.findMany({
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
export const updateReview = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment, images } = req.body;
        const userId = req.user.userId;
        const review = await prisma.review.findUnique({
            where: { id }
        });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (review.clientId !== userId) {
            return res.status(403).json({ message: 'Not authorized to update this review' });
        }
        const updatedReview = await prisma.review.update({
            where: { id },
            data: { rating, comment, images }
        });
        // Recalculate salon's average rating
        const salonReviews = await prisma.review.findMany({
            where: { salonId: review.salonId }
        });
        const averageRating = salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length;
        await prisma.salon.update({
            where: { id: review.salonId },
            data: { averageRating }
        });
        res.json(updatedReview);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export const deleteReview = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;
        const review = await prisma.review.findUnique({
            where: { id }
        });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (review.clientId !== userId && userRole !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this review' });
        }
        await prisma.review.delete({
            where: { id }
        });
        // Recalculate salon's average rating
        const salonReviews = await prisma.review.findMany({
            where: { salonId: review.salonId }
        });
        const averageRating = salonReviews.length > 0
            ? salonReviews.reduce((sum, r) => sum + r.rating, 0) / salonReviews.length
            : 0;
        await prisma.salon.update({
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
