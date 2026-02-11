import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { authenticate } from "../middleware/auth.js";
import { requireRole, UserRole, UserRoles } from "../middleware/rbac.js";
import { config } from "../config/index.js";
import { logger, logAudit } from "../utils/logger.js";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Validation middleware
const handleValidation = (
    req: Request,
    res: Response,
    next: Function,
): void => {
    const errors = validationResult(req);
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
router.get(
    "/",
    authenticate,
    requireRole("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { role, isActive, page = 1, limit = 20 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const where: Record<string, unknown> = {};
            if (role) where.role = role;
            if (isActive !== undefined) where.isActive = isActive === "true";

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
        } catch (error) {
            logger.error("Get users error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch users",
                code: "FETCH_USERS_ERROR",
            });
        }
    },
);

/**
 * POST /users
 * Create new user (Admin only)
 * Users cannot self-register
 */
router.post(
    "/",
    authenticate,
    requireRole("ADMIN"),
    [
        body("email").isEmail().normalizeEmail(),
        body("firstName").trim().notEmpty(),
        body("lastName").trim().notEmpty(),
        body("role").trim().notEmpty(),
        body("password").isLength({ min: 8 }),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { email, firstName, lastName, role, siteIds, password } =
                req.body;

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

            // Check if role exists in database (allows custom roles)
            const existingRole = await prisma.role.findUnique({
                where: { name: role },
            });

            if (!existingRole) {
                res.status(400).json({
                    success: false,
                    error: "Role not found. Please select a valid role.",
                    code: "INVALID_ROLE",
                });
                return;
            }

            // Hash password
            const passwordHash = await bcrypt.hash(
                password,
                config.bcrypt.rounds,
            );

            // Create user
            const user = await prisma.user.create({
                data: {
                    email,
                    passwordHash,
                    firstName,
                    lastName,
                    role: role as UserRole,
                    isActive: true,
                    assignedSites: siteIds
                        ? {
                              connect: siteIds.map((id: string) => ({ id })),
                          }
                        : undefined,
                },
                include: {
                    roleObj: true,
                    assignedSites: true,
                },
            });

            logAudit(
                adminUser.id,
                "user.create",
                "users",
                user.id,
                {
                    email: user.email,
                    role: user.roleObj?.name,
                    assignedSites: siteIds,
                },
                "success",
            );

            logger.info(
                `User ${user.email} created by admin ${adminUser.email}`,
            );

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
        } catch (error) {
            logger.error("Create user error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create user",
                code: "CREATE_USER_ERROR",
            });
        }
    },
);

/**
 * GET /users/:id
 * Get user by ID (Admin only)
 */
router.get(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
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
        } catch (error) {
            logger.error("Get user error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch user",
                code: "FETCH_USER_ERROR",
            });
        }
    },
);

/**
 * PATCH /users/:id
 * Update user (Admin only)
 */
router.patch(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    [
        body("firstName").optional().trim().notEmpty(),
        body("lastName").optional().trim().notEmpty(),
        body("role").optional().trim().notEmpty(),
        body("isActive").optional().isBoolean(),
        body("password").optional().isLength({ min: 8 }),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { id } = req.params;
            const { firstName, lastName, role, isActive, siteIds, password } =
                req.body;

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

            // If role is being updated, check if it exists in database
            if (role !== undefined) {
                const existingRole = await prisma.role.findUnique({
                    where: { name: role },
                });
                if (!existingRole) {
                    res.status(400).json({
                        success: false,
                        error: "Role not found. Please select a valid role.",
                        code: "INVALID_ROLE",
                    });
                    return;
                }
            }

            const updateData: Record<string, unknown> = {};
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
            if (role !== undefined) updateData.role = role;
            if (isActive !== undefined) updateData.isActive = isActive;

            // Update password if provided
            if (password !== undefined) {
                const passwordHash = await bcrypt.hash(
                    password,
                    config.bcrypt.rounds,
                );
                updateData.passwordHash = passwordHash;
            }

            // Handle site assignments
            if (siteIds !== undefined) {
                updateData.assignedSites = {
                    set: siteIds.map((sid: string) => ({ id: sid })),
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

            logAudit(
                adminUser.id,
                "user.update",
                "users",
                id,
                { changes: updateData },
                "success",
            );

            logger.info(
                `User ${user.email} updated by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                data: { user: updatedUser },
                message: "User updated successfully",
            });
        } catch (error) {
            logger.error("Update user error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update user",
                code: "UPDATE_USER_ERROR",
            });
        }
    },
);

/**
 * DELETE /users/:id
 * Delete user (Admin only)
 */
router.delete(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
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

            logAudit(
                adminUser.id,
                "user.delete",
                "users",
                id,
                { email: user.email },
                "success",
            );

            logger.info(
                `User ${user.email} deleted by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                message: "User deleted successfully",
            });
        } catch (error) {
            logger.error("Delete user error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete user",
                code: "DELETE_USER_ERROR",
            });
        }
    },
);

/**
 * POST /users/:id/reset-password
 * Reset user password (Admin only)
 */
router.post(
    "/:id/reset-password",
    authenticate,
    requireRole("ADMIN"),
    [body("newPassword").isLength({ min: 8 }), handleValidation],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
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

            const passwordHash = await bcrypt.hash(
                newPassword,
                config.bcrypt.rounds,
            );

            await prisma.user.update({
                where: { id },
                data: { passwordHash },
            });

            logAudit(
                adminUser.id,
                "user.reset_password",
                "users",
                id,
                { email: user.email },
                "success",
            );

            logger.info(
                `Password reset for user ${user.email} by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                message: "Password reset successfully",
            });
        } catch (error) {
            logger.error("Reset password error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to reset password",
                code: "RESET_PASSWORD_ERROR",
            });
        }
    },
);

export default router;
