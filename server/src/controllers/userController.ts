import { NextFunction, Request, Response } from "express";
import dotenv from "dotenv"
import asyncHandler from "../middlewares/asyncHandler";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import { UserRequest } from "../utils/types/userTypes";
import {pool} from "../index"
import { createAndSendNotification } from "../services/notificationService";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../config/prisma";
import { getAllUsersService } from "@/services/aiService";
dotenv.config()
//Debugging  - check if env var are loaded correctly  

const jwtSecret:any = process.env.ACCESS_TOKEN_SECRET;
const refreshSecret:any= process.env.REFRESH_TOKEN_SECRET;

const generateToken = async (res: Response, id: string, role: string) => {
  if (!jwtSecret || !refreshSecret) {
      throw new Error("ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET is not defined in environment variables");
  }

  try {
      const accessToken = jwt.sign({ id, role }, jwtSecret, { expiresIn: "1d" });
      const refreshToken = jwt.sign({ id }, refreshSecret, { expiresIn: "30d" });

      res.cookie("access_token", accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 24 * 60 * 60 * 1000 // 1 day in ms
      });

      res.cookie("refresh_token", refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return { accessToken, refreshToken, expiresIn: 900 }; // 900s = 15min
  } catch (error) {
      console.error("Error generating JWT:", error);
      throw new Error("Error generating authentication tokens");
  }
};


/** Create a new user */
export const createUser = asyncHandler(async (req:Request, res:Response) => {
  console.log("🔥 createUser endpoint hit with body:", req.body);
  const { email, phone, password, firstName, lastName, role } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const { rows } = await pool.query(
    `INSERT INTO users (email, phone, password, "firstName", "lastName", role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, "firstName", "lastName", role, "isActive"`,
    [email, phone, hashedPassword, firstName, lastName, role.toUpperCase()]
  );

  const user = rows[0];

//   await createAndSendNotification({
//   role: "ADMIN",
//   title: "New user registration",
//   message: `New user ${user.email} registered and is awaiting approval.`,
//   type: "GENERAL",
//   data: { id: user.id, email: user.email },
//   sendEmail: true,
//   emailTo: "admin@faharibeauty.com"
// });

  // Notify the user
  await createAndSendNotification({
    userId: user.id,
    title: "Account pending approval",
    message: "Thanks for signing up! Log in to continue.",
    type: "GENERAL",
  });

  res.status(201).json({
    message: "Account created. Login to continue.",
    user,
  });
});

/** Login user and return JWT */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  console.log("login hit");
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  if (!rows.length) return res.status(401).json({ message: "Email not found!" });

  const user = rows[0];

  if (!user.isActive) {
    return res.status(403).json({
      message: "Your account is pending admin approval. Please wait before logging in.",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

  const tokens = await generateToken(res, user.id, user.role);

  // ✅ Return the same user data structure as getMe
  return res.status(200).json({
    message: "Login successful",
    accessToken: tokens.accessToken,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

export const getMe = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { rows } = await pool.query(
    `SELECT id, email, phone, "firstName", "lastName", avatar, role, "isActive", "isVerified", "createdAt", "updatedAt"
     FROM users
     WHERE id = $1`,
    [req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(rows[0]);
});

export const logoutUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  //We need to immedietly invalidate the access token and the refreh token 
  console.log("logout endpoint hit");
  res.cookie("access_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0) // Expire immediately
  });

  res.cookie("refresh_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      expires: new Date(0) // Expire immediately
  });

  res.status(200).json({ message: "User logged out successfully" });
});

export const approveUser = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can approve users" });
  }

  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE users SET "isActive" = true WHERE id = $1 RETURNING *`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ message: "User not found" });

  const user = rows[0];

  await createAndSendNotification({
    userId: user.id,
    title: "Account approved",
    message: "Welcome to Fahari Beauty! Your account has been approved! You can now log in.",
    type: "GENERAL",
    sendEmail: true,
    emailTo: user.email,
  });

  res.json({ message: "User approved successfully", user });
});

/**
 * Suspend a user (Admins only)
 */
export const suspendUser = asyncHandler(async (req: UserRequest, res: Response) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can suspend users" });
  }

  const { id } = req.params;

  const { rows } = await pool.query(
    `UPDATE users SET "isActive" = false WHERE id = $1 RETURNING *`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ message: "User not found" });

  const user = rows[0];

  await createAndSendNotification({
    userId: user.id,
    title: "Account suspended",
    message: "We are sorry to see you go.Your account has been suspended. Please contact support.",
    type: "GENERAL",
    sendEmail: true,
    emailTo: user.email,
  });

  res.json({ message: "User suspended successfully", user });
});

/** Get all users */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await getAllUsersService();
  res.json(users);
});


/** Get user by ID */
export const getUserById = asyncHandler(async (req: Request, res: Response)=> {
  try {
    const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (error:any) {
    res.status(500).json({ message: error.message });
  }
})

const uploadDirUser = "uploads/users";
if (!fs.existsSync(uploadDirUser)) {
  fs.mkdirSync(uploadDirUser, { recursive: true });
}

const userStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirUser);
  },
  filename: (_req, file, cb) => {
    // Create unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const uploadUserAvatar = multer({
  storage:userStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 1 // Max 12 files total (1 profile + 1 cover + 10 gallery)
  },
  fileFilter
});


// Controller to update user
export const updateUser = asyncHandler(async (req: UserRequest, res: Response) => {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = req.params.id;
  
  if (userId !== user.id && user.role !== "ADMIN") {
    return res.status(403).json({ message: "Forbidden: Cannot update other user's profile" });
  }

  console.log("🔥 Update user endpoint hit for user ID:", userId);
  console.log("🔥 Request body:", req.body);
  console.log("🔥 Current user:", user);
  
  try {
    const { firstName, lastName, email, phone} = req.body;
    const avatar=req.file
    console.log("🔥 File received:", avatar);
          
      // Delete old avatar if it exists
      if (user.avatar) {
        // Extract just the filename from the stored path if it's a full path
        const oldAvatarFilename = user.avatar.startsWith('/uploads/users/') 
          ? path.basename(user.avatar)
          : user.avatar;
        console.log("found olf file",oldAvatarFilename)
        const oldAvatarPath = path.join(__dirname, "..\\..\\uploads\\users", oldAvatarFilename);
        deleteFileIfExists(oldAvatarPath);
        console.log("🔥 Attempted to delete old avatar:", oldAvatarPath);
      }
      
      // Store the full path consistently
      console.log("🔥 New avatar path to store:", avatar);
    

    if (firstName !== undefined && firstName !== null) {
      user.firstName = firstName.trim();
    }
    if (lastName !== undefined && lastName !== null) {
      user.lastName = lastName.trim();
    }
    if (email !== undefined && email !== null) {
      user.email = email.trim().toLowerCase();
    }
    if (phone !== undefined && phone !== null) {
      user.phone = phone.trim();
    }
    if (avatar !== undefined && avatar !== null) {
      user.avatar = avatar.filename;
    }
    console.log("avatar string:", user.avatar);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: user,
      
    });

    console.log("🔥 User updated successfully:", updatedUser);
    res.json(updatedUser);
    
  } catch (error: any) {
    console.error("🔥 Error updating user:", error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        message: "Email already exists. Please use a different email address." 
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        message: "User not found." 
      });
    }
    
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

const deleteFileIfExists = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🔥 Successfully deleted file: ${filePath}`);
      return true;
    } else {
      console.log(`🔥 File doesn't exist: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`🔥 Error deleting file ${filePath}:`, error);
    return false;
  }
};

/** Delete user */
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, delete notifications for the user
    await client.query(`DELETE FROM notifications WHERE "userId" = $1`, [req.params.id]);

    // Then, delete the user
    const { rowCount } = await client.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    if (!rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "User not found" });
    }

    await client.query('COMMIT');
    res.json({ message: "User and their notifications deleted successfully" });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
});
