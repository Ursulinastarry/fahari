import asyncHandler from "../middlewares/asyncHandler.js";
import prisma from "../config/prisma.js";
export const updateClientProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.userId;
        const { dateOfBirth, gender, location, preferences } = req.body;
        const clientProfile = await prisma.clientProfile.upsert({
            where: { userId },
            update: {
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                gender,
                location,
                preferences
            },
            create: {
                userId,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                gender,
                location,
                preferences
            }
        });
        res.json();
    }
    catch (error) {
        // res.status(500).json({ message: error.message });
    }
});
