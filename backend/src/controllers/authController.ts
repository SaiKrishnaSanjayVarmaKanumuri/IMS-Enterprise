import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { config } from "../config/index.js";
import { generateToken, authenticate } from "../middleware/auth.js";
import { logger, logAudit } from "../utils/logger.js";

const prisma = new PrismaClient();

// Role type (string for SQLite compatibility)
type UserRole =
    | "ADMIN"
    | "SITE_ENGINEER"
    | "PROCUREMENT"
    | "FINANCE"
    | "FRONT_MAN";

/**
 * Login Controller
 * Authenticates users and returns JWT token
 *
 * IMPORTANT: No self-signup. Only Admin can create user accounts.
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: "Email and password are required",
                code: "MISSING_CREDENTIALS",
            });
            return;
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                roleObj: true,
            },
        });

        if (!user) {
            logAudit(
                null,
                "auth.login_failed",
                "auth",
                undefined,
                { email: email.toLowerCase(), reason: "user_not_found" },
                "failed",
            );

            res.status(401).json({
                success: false,
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
            return;
        }

        // Check if user is active
        if (!user.isActive) {
            logAudit(
                user.id,
                "auth.login_failed",
                "auth",
                undefined,
                { email: user.email, reason: "account_deactivated" },
                "failed",
            );

            res.status(403).json({
                success: false,
                error: "Your account has been deactivated. Please contact administrator.",
                code: "ACCOUNT_DEACTIVATED",
            });
            return;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!isValidPassword) {
            logAudit(
                user.id,
                "auth.login_failed",
                "auth",
                undefined,
                { email: user.email, reason: "invalid_password" },
                "failed",
            );

            res.status(401).json({
                success: false,
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
            return;
        }

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
        });

        // Log successful login
        logAudit(
            user.id,
            "auth.login_success",
            "auth",
            user.id,
            { email: user.email, role: user.role },
            "success",
        );

        logger.info(`User ${user.email} logged in successfully`);

        // Return user info and token
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    roleDescription: user.roleObj?.description || "",
                },
                token,
            },
        });
    } catch (error) {
        logger.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Login failed",
            code: "LOGIN_ERROR",
        });
    }
};

/**
 * Get Current User Info
 */
export const me = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (!user) {
            res.status(401).json({
                success: false,
                error: "Not authenticated",
                code: "NOT_AUTHENTICATED",
            });
            return;
        }

        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                roleObj: {
                    include: {
                        permissions: true,
                    },
                },
                assignedSites: true,
            },
        });

        if (!fullUser) {
            res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
            return;
        }

        // Handle case where roleObj is null
        if (!fullUser.roleObj) {
            res.status(404).json({
                success: false,
                error: "User role not found",
                code: "ROLE_NOT_FOUND",
            });
            return;
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: fullUser.id,
                    email: fullUser.email,
                    firstName: fullUser.firstName,
                    lastName: fullUser.lastName,
                    role: fullUser.roleObj,
                    permissions: fullUser.roleObj.permissions.map(
                        (p: { name: string }) => p.name,
                    ),
                    assignedSites: fullUser.assignedSites,
                },
            },
        });
    } catch (error) {
        logger.error("Get current user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get user info",
            code: "USER_INFO_ERROR",
        });
    }
};

/**
 * Change Password
 */
export const changePassword = async (
    req: Request,
    res: Response,
): Promise<void> => {
    try {
        const user = req.user;
        const { currentPassword, newPassword } = req.body;

        if (!user) {
            res.status(401).json({
                success: false,
                error: "Not authenticated",
                code: "NOT_AUTHENTICATED",
            });
            return;
        }

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                error: "Current password and new password are required",
                code: "MISSING_PASSWORD",
            });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({
                success: false,
                error: "New password must be at least 8 characters",
                code: "WEAK_PASSWORD",
            });
            return;
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
        });

        if (!dbUser) {
            res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
            return;
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(
            currentPassword,
            dbUser.passwordHash,
        );

        if (!isValidPassword) {
            logAudit(
                user.id,
                "auth.password_change_failed",
                "auth",
                user.id,
                { reason: "invalid_current_password" },
                "failed",
            );

            res.status(401).json({
                success: false,
                error: "Current password is incorrect",
                code: "INVALID_PASSWORD",
            });
            return;
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(
            newPassword,
            config.bcrypt.rounds,
        );

        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash },
        });

        logAudit(
            user.id,
            "auth.password_changed",
            "auth",
            user.id,
            {},
            "success",
        );

        logger.info(`User ${user.email} changed password`);

        res.json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        logger.error("Change password error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to change password",
            code: "PASSWORD_CHANGE_ERROR",
        });
    }
};

/**
 * Logout - Client-side token removal, but we log it
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = req.user;

        if (user) {
            logAudit(
                user.id,
                "auth.logout",
                "auth",
                user.id,
                { email: user.email },
                "success",
            );
        }

        res.json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        logger.error("Logout error:", error);
        res.status(500).json({
            success: false,
            error: "Logout failed",
            code: "LOGOUT_ERROR",
        });
    }
};

export default { login, me, changePassword, logout };
