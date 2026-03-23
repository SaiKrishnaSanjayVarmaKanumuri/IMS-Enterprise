"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.changePassword = exports.me = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const index_js_1 = require("../config/index.js");
const auth_js_1 = require("../middleware/auth.js");
const logger_js_1 = require("../utils/logger.js");
const prisma = new client_1.PrismaClient();
/**
 * Login Controller
 * Authenticates users and returns JWT token
 *
 * IMPORTANT: No self-signup. Only Admin can create user accounts.
 */
const login = async (req, res) => {
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
            (0, logger_js_1.logAudit)(null, "auth.login_failed", "auth", undefined, { email: email.toLowerCase(), reason: "user_not_found" }, "failed");
            res.status(401).json({
                success: false,
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
            return;
        }
        // Check if user is active
        if (!user.isActive) {
            (0, logger_js_1.logAudit)(user.id, "auth.login_failed", "auth", undefined, { email: user.email, reason: "account_deactivated" }, "failed");
            res.status(403).json({
                success: false,
                error: "Your account has been deactivated. Please contact administrator.",
                code: "ACCOUNT_DEACTIVATED",
            });
            return;
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            (0, logger_js_1.logAudit)(user.id, "auth.login_failed", "auth", undefined, { email: user.email, reason: "invalid_password" }, "failed");
            res.status(401).json({
                success: false,
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
            return;
        }
        // Generate JWT token
        const token = (0, auth_js_1.generateToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        // Log successful login
        (0, logger_js_1.logAudit)(user.id, "auth.login_success", "auth", user.id, { email: user.email, role: user.role }, "success");
        logger_js_1.logger.info(`User ${user.email} logged in successfully`);
        // Get assigned sites and permissions for the user
        const assignedSites = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                assignedSites: true,
                roleObj: {
                    include: {
                        permissions: true,
                    },
                },
            },
        });
        // Extract permission names
        const permissions = assignedSites?.roleObj?.permissions.map((p) => p.name) || [];
        // Return user info and token (include full role object, permissions and assignedSites)
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.roleObj, // Return full role object
                    roleDescription: user.roleObj?.description || "",
                    isActive: user.isActive,
                    permissions: permissions,
                    assignedSites: assignedSites?.assignedSites || [],
                },
                token,
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Login failed",
            code: "LOGIN_ERROR",
        });
    }
};
exports.login = login;
/**
 * Get Current User Info
 */
const me = async (req, res) => {
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
                    permissions: fullUser.roleObj.permissions.map((p) => p.name),
                    assignedSites: fullUser.assignedSites,
                },
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Get current user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get user info",
            code: "USER_INFO_ERROR",
        });
    }
};
exports.me = me;
/**
 * Change Password
 */
const changePassword = async (req, res) => {
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
        const isValidPassword = await bcryptjs_1.default.compare(currentPassword, dbUser.passwordHash);
        if (!isValidPassword) {
            (0, logger_js_1.logAudit)(user.id, "auth.password_change_failed", "auth", user.id, { reason: "invalid_current_password" }, "failed");
            res.status(401).json({
                success: false,
                error: "Current password is incorrect",
                code: "INVALID_PASSWORD",
            });
            return;
        }
        // Hash new password
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, index_js_1.config.bcrypt.rounds);
        // Update password
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newPasswordHash },
        });
        (0, logger_js_1.logAudit)(user.id, "auth.password_changed", "auth", user.id, {}, "success");
        logger_js_1.logger.info(`User ${user.email} changed password`);
        res.json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Change password error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to change password",
            code: "PASSWORD_CHANGE_ERROR",
        });
    }
};
exports.changePassword = changePassword;
/**
 * Logout - Client-side token removal, but we log it
 */
const logout = async (req, res) => {
    try {
        const user = req.user;
        if (user) {
            (0, logger_js_1.logAudit)(user.id, "auth.logout", "auth", user.id, { email: user.email }, "success");
        }
        res.json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Logout error:", error);
        res.status(500).json({
            success: false,
            error: "Logout failed",
            code: "LOGOUT_ERROR",
        });
    }
};
exports.logout = logout;
exports.default = { login: exports.login, me: exports.me, changePassword: exports.changePassword, logout: exports.logout };
//# sourceMappingURL=authController.js.map