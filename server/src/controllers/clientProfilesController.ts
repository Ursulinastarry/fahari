import asyncHandler from "../middlewares/asyncHandler";
import { UserRequest } from "../utils/types/userTypes";
import prisma from "../config/prisma";

export const updateClientProfile = asyncHandler(async (req: UserRequest, res: Response) => {
  try {
    const userId = (req as any).user.userId;
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
  } catch (error: any) {
    // res.status(500).json({ message: error.message });
  }
});