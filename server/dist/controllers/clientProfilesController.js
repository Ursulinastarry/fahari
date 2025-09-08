"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateClientProfile = void 0;
const asyncHandler_1 = __importDefault(require("@app/middlewares/asyncHandler"));
const prisma_1 = __importDefault(require("../config/prisma"));
exports.updateClientProfile = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const userId = req.user.userId;
        const { dateOfBirth, gender, location, preferences } = req.body;
        const clientProfile = await prisma_1.default.clientProfile.upsert({
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
