import dotenv from "dotenv";
import asyncHandler from "../middlewares/asyncHandler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../index";
import { createAndSendNotification } from "../services/notificationService";
import multer from "multer";
import path from "path";
import fs from "fs";
import prisma from "../config/prisma";
dotenv.config();
//Debugging  - check if env var are loaded correctly  
const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
const generateToken = (res, id, role) => {
    if (!jwtSecret || !refreshSecret) {
        throw new Error("ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET is not defined in environment variables");
    }
    try {
        const accessToken = jwt.sign({ id, role }, jwtSecret, { expiresIn: "1d" });
        const refreshToken = jwt.sign({ id }, refreshSecret, { expiresIn: "30d" });
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000 // 1 day in ms
        });
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        return { accessToken, refreshToken, expiresIn: 900 }; // 900s = 15min
    }
    catch (error) {
        console.error("Error generating JWT:", error);
        throw new Error("Error generating authentication tokens");
    }
};
/** Create a new user */
export const createUser = asyncHandler(async (req, res) => {
    const { email, phone, password, firstName, lastName, role } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const { rows } = await pool.query(`INSERT INTO users (email, phone, password, "firstName", "lastName", role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, "firstName", "lastName", role, "isActive"`, [email, phone, hashedPassword, firstName, lastName, role.toUpperCase()]);
    const user = rows[0];
    // Notify all admins
    await createAndSendNotification({
        role: "ADMIN",
        title: "New user registration",
        message: `New user ${user.email} registered and is awaiting approval.`,
        type: "GENERAL",
        data: { id: user.id, email: user.email },
    });
    // Notify the user
    await createAndSendNotification({
        userId: user.id,
        title: "Account pending approval",
        message: "Thanks for signing up! An admin will review your account shortly.",
        type: "GENERAL",
    });
    res.status(201).json({
        message: "Account created. Please wait for admin approval.",
        user,
    });
});
/** Login user and return JWT */
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (!rows.length)
        return res.status(401).json({ message: "Invalid email or password" });
    const user = rows[0];
    if (!user.isActive) {
        return res.status(403).json({
            message: "Your account is pending admin approval. Please wait before logging in.",
        });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
        return res.status(401).json({ message: "Invalid email or password" });
    const tokens = await generateToken(res, user.id, user.role);
    return res.status(200).json({
        message: "Login successful",
        accessToken: tokens.accessToken,
        user: { id: user.id, email: user.email, role: user.role },
    });
});
export const getMe = asyncHandler(async (req, res) => {
    // console.log("🔥 getMe endpoint hit");
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Fetch the user from DB to get the latest info
    const { rows } = await pool.query(`SELECT id, email, phone, "firstName", "lastName", avatar, role, "isActive", "isVerified", "createdAt", "updatedAt"
     FROM users
     WHERE id = $1`, [req.user.id]);
    if (!rows.length) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json(rows[0]);
});
export const logoutUser = asyncHandler(async (req, res, next) => {
    //We need to immedietly invalidate the access token and the refreh token 
    res.cookie("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "production",
        sameSite: "strict",
        expires: new Date(0) // Expire immediately
    });
    res.cookie("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "production",
        sameSite: "strict",
        expires: new Date(0) // Expire immediately
    });
    res.status(200).json({ message: "User logged out successfully" });
});
export const approveUser = asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only admins can approve users" });
    }
    const { id } = req.params;
    const { rows } = await pool.query(`UPDATE users SET "isActive" = true WHERE id = $1 RETURNING *`, [id]);
    if (!rows.length)
        return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    await createAndSendNotification({
        userId: user.id,
        title: "Account approved 🎉",
        message: "Your account has been approved! You can now log in.",
        type: "GENERAL",
    });
    res.json({ message: "User approved successfully", user });
});
/**
 * Suspend a user (Admins only)
 */
export const suspendUser = asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only admins can suspend users" });
    }
    const { id } = req.params;
    const { rows } = await pool.query(`UPDATE users SET "isActive" = false WHERE id = $1 RETURNING *`, [id]);
    if (!rows.length)
        return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    await createAndSendNotification({
        userId: user.id,
        title: "Account suspended ⛔",
        message: "Your account has been suspended. Please contact support.",
        type: "GENERAL",
    });
    res.json({ message: "User suspended successfully", user });
});
/** Get all users */
export const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM users`);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/** Get user by ID */
export const getUserById = asyncHandler(async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
        if (!rows.length)
            return res.status(404).json({ message: "User not found" });
        res.json(rows[0]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
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
const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'));
    }
};
export const uploadUserAvatar = multer({
    storage: userStorage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 1 // Max 12 files total (1 profile + 1 cover + 10 gallery)
    },
    fileFilter
});
// Controller to update user
export const updateUser = asyncHandler(async (req, res) => {
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
        const { firstName, lastName, email, phone } = req.body;
        const avatar = req.file;
        console.log("🔥 File received:", avatar);
        // Delete old avatar if it exists
        if (user.avatar) {
            // Extract just the filename from the stored path if it's a full path
            const oldAvatarFilename = user.avatar.startsWith('/uploads/users/')
                ? path.basename(user.avatar)
                : user.avatar;
            console.log("found olf file", oldAvatarFilename);
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
    }
    catch (error) {
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
const deleteFileIfExists = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🔥 Successfully deleted file: ${filePath}`);
            return true;
        }
        else {
            console.log(`🔥 File doesn't exist: ${filePath}`);
            return false;
        }
    }
    catch (error) {
        console.error(`🔥 Error deleting file ${filePath}:`, error);
        return false;
    }
};
/** Delete user */
export const deleteUser = asyncHandler(async (req, res) => {
    try {
        const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
        if (!rowCount)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
