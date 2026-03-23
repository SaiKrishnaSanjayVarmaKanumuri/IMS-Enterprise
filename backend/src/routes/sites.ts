import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { requireRole, requirePermission } from "../middleware/rbac.js";
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
 * GET /sites
 * Get sites based on role
 * - Admin: All sites
 * - FM/Engineer: Assigned sites only
 * - Procurement/Finance: All sites (for viewing)
 */
router.get(
    "/",
    authenticate,
    requirePermission("sites:read"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { status, page = 1, limit = 20 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            let where: Record<string, unknown> = {};
            if (status) where.status = status;

            // Non-admin users only see assigned sites
            if (user.role !== "ADMIN") {
                where.assignedUsers = {
                    some: { id: user.id },
                };
            }

            const [sites, total] = await Promise.all([
                prisma.site.findMany({
                    where,
                    include: {
                        assignedUsers: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                            },
                        },
                        _count: {
                            select: { requests: true },
                        },
                    },
                    orderBy: { name: "asc" },
                    skip,
                    take,
                }),
                prisma.site.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    sites,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            logger.error("Get sites error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch sites",
                code: "FETCH_SITES_ERROR",
            });
        }
    },
);

/**
 * GET /sites/:id
 * Get site by ID
 */
router.get(
    "/:id",
    authenticate,
    requirePermission("sites:read"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;

            const site = await prisma.site.findUnique({
                where: { id },
                include: {
                    assignedUsers: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        },
                    },
                    requests: {
                        take: 10,
                        orderBy: { createdAt: "desc" },
                        include: {
                            requester: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!site) {
                res.status(404).json({
                    success: false,
                    error: "Site not found",
                    code: "SITE_NOT_FOUND",
                });
                return;
            }

            // Check access for non-admin users
            if (user.role !== "ADMIN") {
                const isAssigned = site.assignedUsers.some(
                    (u) => u.id === user.id,
                );
                if (!isAssigned) {
                    res.status(403).json({
                        success: false,
                        error: "You are not assigned to this site",
                        code: "NOT_ASSIGNED",
                    });
                    return;
                }
            }

            res.json({
                success: true,
                data: { site },
            });
        } catch (error) {
            logger.error("Get site error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch site",
                code: "FETCH_SITE_ERROR",
            });
        }
    },
);

/**
 * POST /sites
 * Create new site (Admin only)
 */
router.post(
    "/",
    authenticate,
    requireRole("ADMIN"),
    [
        body("name").trim().notEmpty(),
        body("code").trim().notEmpty().isLength({ min: 3, max: 20 }),
        body("address").trim().notEmpty(),
        body("projectManager").optional().trim(),
        body("status").optional().isIn(["active", "inactive", "completed"]),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { name, code, address, projectManager, status, userIds } =
                req.body;

            // Check if code already exists
            const existingSite = await prisma.site.findUnique({
                where: { code },
            });

            if (existingSite) {
                res.status(409).json({
                    success: false,
                    error: "Site code already exists",
                    code: "CODE_EXISTS",
                });
                return;
            }

            const site = await prisma.site.create({
                data: {
                    name,
                    code: code.toUpperCase(),
                    address,
                    projectManager,
                    status: status || "active",
                    assignedUsers: userIds
                        ? {
                              connect: userIds.map((id: string) => ({ id })),
                          }
                        : undefined,
                },
                include: {
                    assignedUsers: true,
                },
            });

            logAudit(
                adminUser.id,
                "site.create",
                "sites",
                site.id,
                { name: site.name, code: site.code },
                "success",
            );

            logger.info(
                `Site ${site.name} (${site.code}) created by admin ${adminUser.email}`,
            );

            res.status(201).json({
                success: true,
                data: { site },
                message: "Site created successfully",
            });
        } catch (error) {
            logger.error("Create site error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create site",
                code: "CREATE_SITE_ERROR",
            });
        }
    },
);

/**
 * PATCH /sites/:id
 * Update site (Admin only)
 */
router.patch(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    [
        body("name").optional().trim().notEmpty(),
        body("code").optional().trim().isLength({ min: 3, max: 20 }),
        body("address").optional().trim().notEmpty(),
        body("projectManager").optional().trim(),
        body("status").optional().isIn(["active", "inactive", "completed"]),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { id } = req.params;
            const { name, code, address, projectManager, status, userIds } =
                req.body;

            const site = await prisma.site.findUnique({ where: { id } });

            if (!site) {
                res.status(404).json({
                    success: false,
                    error: "Site not found",
                    code: "SITE_NOT_FOUND",
                });
                return;
            }

            // Check for code uniqueness if changing
            if (code && code !== site.code) {
                const existingSite = await prisma.site.findUnique({
                    where: { code: code.toUpperCase() },
                });

                if (existingSite) {
                    res.status(409).json({
                        success: false,
                        error: "Site code already exists",
                        code: "CODE_EXISTS",
                    });
                    return;
                }
            }

            const updateData: Record<string, unknown> = {};
            if (name !== undefined) updateData.name = name;
            if (code !== undefined) updateData.code = code.toUpperCase();
            if (address !== undefined) updateData.address = address;
            if (projectManager !== undefined)
                updateData.projectManager = projectManager;
            if (status !== undefined) updateData.status = status;

            if (userIds !== undefined) {
                // First, get all users currently assigned to this site
                const currentUsers = await prisma.user.findMany({
                    where: {
                        assignedSites: {
                            some: { id: id },
                        },
                    },
                });

                // Disconnect all current users from this site
                for (const user of currentUsers) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            assignedSites: {
                                disconnect: { id: id },
                            },
                        },
                    });
                }

                // Then connect to new users
                if (userIds.length > 0) {
                    updateData.assignedUsers = {
                        set: userIds.map((uid: string) => ({ id: uid })),
                    };

                    // Also update User.assignedSites for each new user
                    for (const userId of userIds) {
                        await prisma.user.update({
                            where: { id: userId },
                            data: {
                                assignedSites: {
                                    connect: { id: id },
                                },
                            },
                        });
                    }
                } else {
                    updateData.assignedUsers = {
                        set: [],
                    };
                }
            }

            const updatedSite = await prisma.site.update({
                where: { id },
                data: updateData,
                include: {
                    assignedUsers: true,
                },
            });

            logAudit(
                adminUser.id,
                "site.update",
                "sites",
                id,
                { changes: updateData },
                "success",
            );

            logger.info(
                `Site ${site.name} updated by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                data: { site: updatedSite },
                message: "Site updated successfully",
            });
        } catch (error) {
            logger.error("Update site error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update site",
                code: "UPDATE_SITE_ERROR",
            });
        }
    },
);

/**
 * DELETE /sites/:id
 * Delete site (Admin only)
 * Note: Site must not have any requests
 */
router.delete(
    "/:id",
    authenticate,
    requireRole("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { id } = req.params;

            const site = await prisma.site.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: { requests: true },
                    },
                },
            });

            if (!site) {
                res.status(404).json({
                    success: false,
                    error: "Site not found",
                    code: "SITE_NOT_FOUND",
                });
                return;
            }

            if (site._count.requests > 0) {
                res.status(400).json({
                    success: false,
                    error: "Cannot delete site with requests. Remove or reassign requests first.",
                    code: "SITE_HAS_REQUESTS",
                });
                return;
            }

            await prisma.site.delete({ where: { id } });

            logAudit(
                adminUser.id,
                "site.delete",
                "sites",
                id,
                { name: site.name, code: site.code },
                "success",
            );

            logger.info(
                `Site ${site.name} deleted by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                message: "Site deleted successfully",
            });
        } catch (error) {
            logger.error("Delete site error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete site",
                code: "DELETE_SITE_ERROR",
            });
        }
    },
);

/**
 * POST /sites/:id/users
 * Assign users to site (Admin only)
 */
router.post(
    "/:id/users",
    authenticate,
    requireRole("ADMIN"),
    [body("userIds").isArray({ min: 1 }), handleValidation],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { id: siteId } = req.params;
            const { userIds } = req.body;

            const site = await prisma.site.findUnique({
                where: { id: siteId },
            });

            if (!site) {
                res.status(404).json({
                    success: false,
                    error: "Site not found",
                    code: "SITE_NOT_FOUND",
                });
                return;
            }

            // Verify all users exist
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
            });

            if (users.length !== userIds.length) {
                res.status(400).json({
                    success: false,
                    error: "One or more users not found",
                    code: "USERS_NOT_FOUND",
                });
                return;
            }

            // Update Site.assignedUsers
            const updatedSite = await prisma.site.update({
                where: { id: siteId },
                data: {
                    assignedUsers: {
                        connect: userIds.map((uid: string) => ({ id: uid })),
                    },
                },
                include: {
                    assignedUsers: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

            // Bidirectional sync: Also update User.assignedSites
            for (const userId of userIds) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        assignedSites: {
                            connect: { id: siteId },
                        },
                    },
                });
            }

            logAudit(
                adminUser.id,
                "site.assign_users",
                "sites",
                siteId,
                { userIds, siteName: site.name },
                "success",
            );

            logger.info(
                `Users assigned to site ${site.name} by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                data: { site: updatedSite },
                message: "Users assigned successfully",
            });
        } catch (error) {
            logger.error("Assign users error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to assign users",
                code: "ASSIGN_USERS_ERROR",
            });
        }
    },
);

/**
 * DELETE /sites/:id/users/:userId
 * Remove user from site (Admin only)
 */
router.delete(
    "/:id/users/:userId",
    authenticate,
    requireRole("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const adminUser = req.user!;
            const { id: siteId, userId } = req.params;

            const site = await prisma.site.findUnique({
                where: { id: siteId },
                include: { assignedUsers: true },
            });

            if (!site) {
                res.status(404).json({
                    success: false,
                    error: "Site not found",
                    code: "SITE_NOT_FOUND",
                });
                return;
            }

            const isAssigned = site.assignedUsers.some((u) => u.id === userId);
            if (!isAssigned) {
                res.status(400).json({
                    success: false,
                    error: "User is not assigned to this site",
                    code: "USER_NOT_ASSIGNED",
                });
                return;
            }

            // Update Site.assignedUsers
            const updatedSite = await prisma.site.update({
                where: { id: siteId },
                data: {
                    assignedUsers: {
                        disconnect: { id: userId },
                    },
                },
                include: {
                    assignedUsers: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });

            // Bidirectional sync: Also update User.assignedSites
            await prisma.user.update({
                where: { id: userId },
                data: {
                    assignedSites: {
                        disconnect: { id: siteId },
                    },
                },
            });

            logAudit(
                adminUser.id,
                "site.remove_user",
                "sites",
                siteId,
                { userId, siteName: site.name },
                "success",
            );

            logger.info(
                `User ${userId} removed from site ${site.name} by admin ${adminUser.email}`,
            );

            res.json({
                success: true,
                data: { site: updatedSite },
                message: "User removed successfully",
            });
        } catch (error) {
            logger.error("Remove user error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to remove user",
                code: "REMOVE_USER_ERROR",
            });
        }
    },
);

export default router;
