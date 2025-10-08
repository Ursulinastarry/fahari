// src/routes/auth.ts
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendNotificationEmail } from "../services/notificationService.js";
const router = Router();
const prisma = new PrismaClient();
// ============================================
// 1. REQUEST PASSWORD RESET
// ============================================
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        // Always return success to prevent email enumeration attacks
        if (!user) {
            return res.status(200).json({
                message: "If an account exists, a password reset link has been sent",
            });
        }
        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        // Token expires in 1 hour
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        // Store hashed token in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetTokenHash,
                resetPasswordExpiry: resetTokenExpiry,
            },
        });
        // Create reset URL
        const resetUrl = `https://faharibeauty.com/reset-password?token=${resetToken}`;
        // Send email with reset link
        await sendNotificationEmail(user.email, "Password Reset Request - Fahari Beauty", `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`, {
            resetUrl,
            expiresAt: resetTokenExpiry.toISOString(),
        });
        console.log(`Password reset email sent to ${user.email}`);
        return res.status(200).json({
            message: "If an account exists, a password reset link has been sent",
        });
    }
    catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ error: "Failed to process request" });
    }
});
// ============================================
// 2. VERIFY RESET TOKEN (optional endpoint)
// ============================================
router.get("/verify-reset-token", async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "Invalid token" });
        }
        // Hash the token to compare with database
        const resetTokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        // Find user with valid token
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: resetTokenHash,
                resetPasswordExpiry: {
                    gt: new Date(), // Token hasn't expired
                },
            },
        });
        if (!user) {
            return res.status(400).json({
                error: "Invalid or expired reset token",
                valid: false,
            });
        }
        return res.status(200).json({
            message: "Token is valid",
            valid: true,
            email: user.email, // Optionally return email to display on form
        });
    }
    catch (error) {
        console.error("Verify token error:", error);
        return res.status(500).json({ error: "Failed to verify token" });
    }
});
// ============================================
// 3. RESET PASSWORD WITH TOKEN
// ============================================
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({
                error: "Token and new password are required",
            });
        }
        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long",
            });
        }
        // Hash the token to compare with database
        const resetTokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
        // Find user with valid token
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: resetTokenHash,
                resetPasswordExpiry: {
                    gt: new Date(),
                },
            },
        });
        if (!user) {
            return res.status(400).json({
                error: "Invalid or expired reset token",
            });
        }
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiry: null,
            },
        });
        // Send confirmation email
        await sendNotificationEmail(user.email, "Password Reset Successful - Fahari Beauty", "Your password has been successfully reset. If you didn't make this change, please contact support immediately.", {
            timestamp: new Date().toISOString(),
        });
        console.log(`Password reset successful for ${user.email}`);
        return res.status(200).json({
            message: "Password reset successful. You can now log in with your new password.",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ error: "Failed to reset password" });
    }
});
export default router;
