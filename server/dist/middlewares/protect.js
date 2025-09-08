"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
// src/middlewares/authMiddleware.ts
const asyncHandler_1 = __importDefault(require("./asyncHandler"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
exports.protect = (0, asyncHandler_1.default)(async (req, res, next) => {
    let token;
    // 1. Try Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    // 2. Fallback cookie
    if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token;
    }
    if (!token) {
        console.log("❌ No token at all");
        return res.status(401).json({ message: "Not authorized, no token" });
    }
    try {
        // console.log("🔑 Verifying token...");
        const decoded = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
        // console.log("✅ Decoded JWT:", decoded);
        const userQuery = await index_1.pool.query(`SELECT id, email, phone, "firstName", "lastName", avatar, role, "isActive", "isVerified"
       FROM users WHERE id = $1`, [decoded.id]);
        if (userQuery.rows.length === 0) {
            // console.log("❌ No user found in DB for id:", decoded.id);
            return res.status(401).json({ message: "User not found" });
        }
        const user = userQuery.rows[0];
        if (!user.isActive) {
            console.log("⚠️ User inactive:", user.id);
            return res.status(403).json({ message: "Account inactive. Wait for approval." });
        }
        req.user = user;
        next();
    }
    catch (err) {
        console.error("❌ JWT error:", err.message);
        return res.status(401).json({ message: "Not authorized, token failed" });
    }
});
