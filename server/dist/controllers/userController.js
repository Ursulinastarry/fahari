"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.getUserById = exports.getAllUsers = exports.suspendUser = exports.approveUser = exports.logoutUser = exports.getMe = exports.loginUser = exports.createUser = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const asyncHandler_1 = __importDefault(require("../middlewares/asyncHandler"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const notificationService_1 = require("../services/notificationService");
dotenv_1.default.config();
//Debugging  - check if env var are loaded correctly  
const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
const generateToken = (res, id, role) => {
    if (!jwtSecret || !refreshSecret) {
        throw new Error("ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET is not defined in environment variables");
    }
    try {
        const accessToken = jsonwebtoken_1.default.sign({ id, role }, jwtSecret, { expiresIn: "1d" });
        const refreshToken = jsonwebtoken_1.default.sign({ id }, refreshSecret, { expiresIn: "30d" });
        res.cookie("access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "production",
            sameSite: "strict",
            maxAge: 24 * 60 * 60 * 1000 // 1 day in ms
        });
        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "production",
            sameSite: "strict",
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
exports.createUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, phone, password, firstName, lastName, role } = req.body;
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    const { rows } = await index_1.pool.query(`INSERT INTO users (email, phone, password, "firstName", "lastName", role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, "firstName", "lastName", role, "isActive"`, [email, phone, hashedPassword, firstName, lastName, role.toUpperCase()]);
    const user = rows[0];
    // Notify all admins
    await (0, notificationService_1.createAndSendNotification)({
        role: "ADMIN",
        title: "New user registration",
        message: `New user ${user.email} registered and is awaiting approval.`,
        type: "GENERAL",
        data: { id: user.id, email: user.email },
    });
    // Notify the user
    await (0, notificationService_1.createAndSendNotification)({
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
exports.loginUser = (0, asyncHandler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    const { rows } = await index_1.pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (!rows.length)
        return res.status(401).json({ message: "Invalid email or password" });
    const user = rows[0];
    if (!user.isActive) {
        return res.status(403).json({
            message: "Your account is pending admin approval. Please wait before logging in.",
        });
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch)
        return res.status(401).json({ message: "Invalid email or password" });
    const tokens = await generateToken(res, user.id, user.role);
    return res.status(200).json({
        message: "Login successful",
        accessToken: tokens.accessToken,
        user: { id: user.id, email: user.email, role: user.role },
    });
});
exports.getMe = (0, asyncHandler_1.default)(async (req, res) => {
    // console.log("🔥 getMe endpoint hit");
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Fetch the user from DB to get the latest info
    const { rows } = await index_1.pool.query(`SELECT id, email, phone, "firstName", "lastName", avatar, role, "isActive", "isVerified", "createdAt", "updatedAt"
     FROM users
     WHERE id = $1`, [req.user.id]);
    if (!rows.length) {
        return res.status(404).json({ message: "User not found" });
    }
    res.json(rows[0]);
});
exports.logoutUser = (0, asyncHandler_1.default)(async (req, res, next) => {
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
exports.approveUser = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only admins can approve users" });
    }
    const { id } = req.params;
    const { rows } = await index_1.pool.query(`UPDATE users SET "isActive" = true WHERE id = $1 RETURNING *`, [id]);
    if (!rows.length)
        return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    await (0, notificationService_1.createAndSendNotification)({
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
exports.suspendUser = (0, asyncHandler_1.default)(async (req, res) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Only admins can suspend users" });
    }
    const { id } = req.params;
    const { rows } = await index_1.pool.query(`UPDATE users SET "isActive" = false WHERE id = $1 RETURNING *`, [id]);
    if (!rows.length)
        return res.status(404).json({ message: "User not found" });
    const user = rows[0];
    await (0, notificationService_1.createAndSendNotification)({
        userId: user.id,
        title: "Account suspended ⛔",
        message: "Your account has been suspended. Please contact support.",
        type: "GENERAL",
    });
    res.json({ message: "User suspended successfully", user });
});
/** Get all users */
exports.getAllUsers = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { rows } = await index_1.pool.query(`SELECT * FROM users`);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/** Get user by ID */
exports.getUserById = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { rows } = await index_1.pool.query(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
        if (!rows.length)
            return res.status(404).json({ message: "User not found" });
        res.json(rows[0]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/** Update user */
exports.updateUser = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const query = `UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *`;
        const values = [name, email, role, req.params.id];
        const { rows } = await index_1.pool.query(query, values);
        if (!rows.length)
            return res.status(404).json({ message: "User not found" });
        res.json(rows[0]);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/** Delete user */
exports.deleteUser = (0, asyncHandler_1.default)(async (req, res) => {
    try {
        const { rowCount } = await index_1.pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
        if (!rowCount)
            return res.status(404).json({ message: "User not found" });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
