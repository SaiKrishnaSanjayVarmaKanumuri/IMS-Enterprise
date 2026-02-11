"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
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
 * GET /sites
 * Get sites based on role
 * - Admin: All sites
 * - FM/Engineer: Assigned sites only
 * - Procurement/Finance: All sites (for viewing)
 */
router.get("/", auth_js_1.authenticate, (0, rbac_js_1.requirePermission)("sites:read"), async (req, res) => {
    try {
        const user = req.user;
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);
        let where = {};
        if (status)
            where.status = status;
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
    }
    catch (error) {
        logger_js_1.logger.error("Get sites error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch sites",
            code: "FETCH_SITES_ERROR",
        });
    }
});
/**
 * GET /sites/:id
 * Get site by ID
 */
router.get("/:id", auth_js_1.authenticate, (0, rbac_js_1.requirePermission)("sites:read"), async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
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
            const isAssigned = site.assignedUsers.some((u) => u.id === user.id);
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
    }
    catch (error) {
        logger_js_1.logger.error("Get site error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch site",
            code: "FETCH_SITE_ERROR",
        });
    }
});
/**
 * POST /sites
 * Create new site (Admin only)
 */
router.post("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [
    (0, express_validator_1.body)("name").trim().notEmpty(),
    (0, express_validator_1.body)("code").trim().notEmpty().isLength({ min: 3, max: 20 }),
    (0, express_validator_1.body)("address").trim().notEmpty(),
    (0, express_validator_1.body)("projectManager").optional().trim(),
    (0, express_validator_1.body)("status").optional().isIn(["active", "inactive", "completed"]),
    handleValidation,
], async (req, res) => {
    try {
        const adminUser = req.user;
        const { name, code, address, projectManager, status, userIds } = req.body;
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
                        connect: userIds.map((id) => ({ id })),
                    }
                    : undefined,
            },
            include: {
                assignedUsers: true,
            },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "site.create", "sites", site.id, { name: site.name, code: site.code }, "success");
        logger_js_1.logger.info(`Site ${site.name} (${site.code}) created by admin ${adminUser.email}`);
        res.status(201).json({
            success: true,
            data: { site },
            message: "Site created successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Create site error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create site",
            code: "CREATE_SITE_ERROR",
        });
    }
});
/**
 * PATCH /sites/:id
 * Update site (Admin only)
 */
router.patch("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [
    (0, express_validator_1.body)("name").optional().trim().notEmpty(),
    (0, express_validator_1.body)("code").optional().trim().isLength({ min: 3, max: 20 }),
    (0, express_validator_1.body)("address").optional().trim().notEmpty(),
    (0, express_validator_1.body)("projectManager").optional().trim(),
    (0, express_validator_1.body)("status").optional().isIn(["active", "inactive", "completed"]),
    handleValidation,
], async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        const { name, code, address, projectManager, status, userIds } = req.body;
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
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (code !== undefined)
            updateData.code = code.toUpperCase();
        if (address !== undefined)
            updateData.address = address;
        if (projectManager !== undefined)
            updateData.projectManager = projectManager;
        if (status !== undefined)
            updateData.status = status;
        if (userIds !== undefined) {
            updateData.assignedUsers = {
                set: userIds.map((uid) => ({ id: uid })),
            };
        }
        const updatedSite = await prisma.site.update({
            where: { id },
            data: updateData,
            include: {
                assignedUsers: true,
            },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "site.update", "sites", id, { changes: updateData }, "success");
        logger_js_1.logger.info(`Site ${site.name} updated by admin ${adminUser.email}`);
        res.json({
            success: true,
            data: { site: updatedSite },
            message: "Site updated successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Update site error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update site",
            code: "UPDATE_SITE_ERROR",
        });
    }
});
/**
 * DELETE /sites/:id
 * Delete site (Admin only)
 * Note: Site must not have any requests
 */
router.delete("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const adminUser = req.user;
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
        (0, logger_js_1.logAudit)(adminUser.id, "site.delete", "sites", id, { name: site.name, code: site.code }, "success");
        logger_js_1.logger.info(`Site ${site.name} deleted by admin ${adminUser.email}`);
        res.json({
            success: true,
            message: "Site deleted successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Delete site error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete site",
            code: "DELETE_SITE_ERROR",
        });
    }
});
/**
 * POST /sites/:id/users
 * Assign users to site (Admin only)
 */
router.post("/:id/users", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [(0, express_validator_1.body)("userIds").isArray({ min: 1 }), handleValidation], async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        const { userIds } = req.body;
        const site = await prisma.site.findUnique({ where: { id } });
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
        const updatedSite = await prisma.site.update({
            where: { id },
            data: {
                assignedUsers: {
                    connect: userIds.map((uid) => ({ id: uid })),
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
        (0, logger_js_1.logAudit)(adminUser.id, "site.assign_users", "sites", id, { userIds, siteName: site.name }, "success");
        logger_js_1.logger.info(`Users assigned to site ${site.name} by admin ${adminUser.email}`);
        res.json({
            success: true,
            data: { site: updatedSite },
            message: "Users assigned successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Assign users error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to assign users",
            code: "ASSIGN_USERS_ERROR",
        });
    }
});
/**
 * DELETE /sites/:id/users/:userId
 * Remove user from site (Admin only)
 */
router.delete("/:id/users/:userId", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const adminUser = req.user;
        const { id, userId } = req.params;
        const site = await prisma.site.findUnique({
            where: { id },
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
        const updatedSite = await prisma.site.update({
            where: { id },
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
        (0, logger_js_1.logAudit)(adminUser.id, "site.remove_user", "sites", id, { userId, siteName: site.name }, "success");
        logger_js_1.logger.info(`User ${userId} removed from site ${site.name} by admin ${adminUser.email}`);
        res.json({
            success: true,
            data: { site: updatedSite },
            message: "User removed successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Remove user error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to remove user",
            code: "REMOVE_USER_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=sites.js.map