"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation middleware
const handleValidation = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            details: errors.array(),
        });
        return;
    }
    next();
};
/**
 * GET /users
 * Get all users (Admin only)
 * Users cannot access this - only Admin
 */
router.get("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { role, isActive, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        const where = {};
        if (role)
            where.role = role;
        if (isActive !== undefined)
            where.isActive = isActive === "true";
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    roleObj: true,
                    assignedSites: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.user.count({ where }),
        ]);
        res.json({
            success: true,
            data: {
                users: users.map((u) => ({
                    id: u.id,
                    email: u.email,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    role: u.roleObj,
                    isActive: u.isActive,
                    assignedSites: u.assignedSites,
                    createdAt: u.createdAt,
                })),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / take),
                },
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Get users error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch users",
            code: "FETCH_USERS_ERROR",
        });
    }
});
/**
 * POST /users
 * Create new user (Admin only)
 * Users cannot self-register
 */
router.post("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("firstName").trim().notEmpty(),
    (0, express_validator_1.body)("lastName").trim().notEmpty(),
    (0, express_validator_1.body)("role").isIn(rbac_js_1.UserRoles),
    (0, express_validator_1.body)("password").isLength({ min: 8 }),
    handleValidation,
], async (req, res) => {
    try {
        const adminUser = req.user;
        const { email, firstName, lastName, role, siteIds, password } = req.body;
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(409).json({
                success: false,
                error: "Email already registered",
                code: "EMAIL_EXISTS",
            });
            return;
        }
        // Hash password
        const passwordHash = await bcryptjs_1.default.hash(password, index_js_1.config.bcrypt.rounds);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                role: role,
                isActive: true,
                assignedSites: siteIds
                    ? {
                        connect: siteIds.map((id) => ({ id })),
                    }
                    : undefined,
            },
            include: {
                roleObj: true,
                assignedSites: true,
            },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "user.create", "users", user.id, {
            email: user.email,
            role: user.roleObj?.name,
            assignedSites: siteIds,
        }, "success");
        logger_js_1.logger.info(`User ${user.email} created by admin ${adminUser.email}`);
        res.status(201).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.roleObj,
                    isActive: user.isActive,
                    assignedSites: user.assignedSites,
                },
            },
            message: "User created successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Create user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create user",
            code: "CREATE_USER_ERROR",
        });
    }
});
/**
 * GET /users/:id
 * Get user by ID (Admin only)
 */
router.get("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                roleObj: true,
                assignedSites: true,
                requests: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
            return;
        }
        res.json({
            success: true,
            data: { user },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Get user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch user",
            code: "FETCH_USER_ERROR",
        });
    }
});
/**
 * PATCH /users/:id
 * Update user (Admin only)
 */
router.patch("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [
    (0, express_validator_1.body)("firstName").optional().trim().notEmpty(),
    (0, express_validator_1.body)("lastName").optional().trim().notEmpty(),
    (0, express_validator_1.body)("role").optional().isIn(rbac_js_1.UserRoles),
    (0, express_validator_1.body)("isActive").optional().isBoolean(),
    handleValidation,
], async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        const { firstName, lastName, role, isActive, siteIds } = req.body;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
            return;
        }
        // Prevent admin from deactivating themselves
        if (id === adminUser.id && isActive === false) {
            res.status(400).json({
                success: false,
                error: "Cannot deactivate your own account",
                code: "CANNOT_DEACTIVATE_SELF",
            });
            return;
        }
        const updateData = {};
        if (firstName !== undefined)
            updateData.firstName = firstName;
        if (lastName !== undefined)
            updateData.lastName = lastName;
        if (role !== undefined)
            updateData.role = role;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        // Handle site assignments
        if (siteIds !== undefined) {
            updateData.assignedSites = {
                set: siteIds.map((sid) => ({ id: sid })),
            };
        }
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                roleObj: true,
                assignedSites: true,
            },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "user.update", "users", id, { changes: updateData }, "success");
        logger_js_1.logger.info(`User ${user.email} updated by admin ${adminUser.email}`);
        res.json({
            success: true,
            data: { user: updatedUser },
            message: "User updated successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Update user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update user",
            code: "UPDATE_USER_ERROR",
        });
    }
});
/**
 * DELETE /users/:id
 * Delete user (Admin only)
 */
router.delete("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        // Prevent admin from deleting themselves
        if (id === adminUser.id) {
            res.status(400).json({
                success: false,
                error: "Cannot delete your own account",
                code: "CANNOT_DELETE_SELF",
            });
            return;
        }
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
            return;
        }
        await prisma.user.delete({ where: { id } });
        (0, logger_js_1.logAudit)(adminUser.id, "user.delete", "users", id, { email: user.email }, "success");
        logger_js_1.logger.info(`User ${user.email} deleted by admin ${adminUser.email}`);
        res.json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Delete user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete user",
            code: "DELETE_USER_ERROR",
        });
    }
});
/**
 * POST /users/:id/reset-password
 * Reset user password (Admin only)
 */
router.post("/:id/reset-password", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [(0, express_validator_1.body)("newPassword").isLength({ min: 8 }), handleValidation], async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        const { newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND",
            });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, index_js_1.config.bcrypt.rounds);
        await prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "user.reset_password", "users", id, { email: user.email }, "success");
        logger_js_1.logger.info(`Password reset for user ${user.email} by admin ${adminUser.email}`);
        res.json({
            success: true,
            message: "Password reset successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to reset password",
            code: "RESET_PASSWORD_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map