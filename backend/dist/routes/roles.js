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
// Valid role names for seed data (predefined system roles)
const SYSTEM_ROLES = [
    "ADMIN",
    "SITE_ENGINEER",
    "PROCUREMENT",
    "FINANCE",
    "FRONT_MAN",
];
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
 * GET /roles
 * Get all roles (Admin only)
 * Users cannot access roles - only Admin can view/manage
 */
router.get("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: true,
                _count: {
                    select: { users: true },
                },
            },
            orderBy: { name: "asc" },
        });
        res.json({
            success: true,
            data: {
                roles: roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    permissions: r.permissions,
                    userCount: r._count.users,
                    createdAt: r.createdAt,
                })),
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Get roles error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch roles",
            code: "FETCH_ROLES_ERROR",
        });
    }
});
/**
 * GET /roles/:id
 * Get role by ID (Admin only)
 */
router.get("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { id } = req.params;
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                permissions: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        isActive: true,
                    },
                },
            },
        });
        if (!role) {
            res.status(404).json({
                success: false,
                error: "Role not found",
                code: "ROLE_NOT_FOUND",
            });
            return;
        }
        res.json({
            success: true,
            data: { role },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Get role error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch role",
            code: "FETCH_ROLE_ERROR",
        });
    }
});
/**
 * POST /roles
 * Create new role (Admin only)
 * Can create custom roles in addition to system roles
 */
router.post("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [
    (0, express_validator_1.body)("name")
        .trim()
        .notEmpty()
        .isLength({ min: 2, max: 50 })
        .matches(/^[A-Z][A-Z0-9_]*$/)
        .withMessage("Role name must be uppercase (e.g., CUSTOM_ROLE)"),
    (0, express_validator_1.body)("description").trim().notEmpty(),
    (0, express_validator_1.body)("permissionIds").isArray({ min: 1 }),
    handleValidation,
], async (req, res) => {
    try {
        const adminUser = req.user;
        const { name, description, permissionIds } = req.body;
        // Check if role name already exists
        const existingRole = await prisma.role.findUnique({
            where: { name: name },
        });
        if (existingRole) {
            res.status(409).json({
                success: false,
                error: "Role with this name already exists",
                code: "ROLE_EXISTS",
            });
            return;
        }
        // Verify all permissions exist
        const permissions = await prisma.permission.findMany({
            where: { id: { in: permissionIds } },
        });
        if (permissions.length !== permissionIds.length) {
            res.status(400).json({
                success: false,
                error: "One or more permissions not found",
                code: "INVALID_PERMISSIONS",
            });
            return;
        }
        const role = await prisma.role.create({
            data: {
                name: name,
                description,
                permissions: {
                    connect: permissionIds.map((id) => ({ id })),
                },
            },
            include: {
                permissions: true,
            },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "role.create", "roles", role.id, { name: role.name, permissionCount: permissions.length }, "success");
        logger_js_1.logger.info(`Role ${role.name} created by admin ${adminUser.email}`);
        res.status(201).json({
            success: true,
            data: { role },
            message: "Role created successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Create role error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to create role",
            code: "CREATE_ROLE_ERROR",
        });
    }
});
/**
 * PATCH /roles/:id
 * Update role (Admin only)
 */
router.patch("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), [
    (0, express_validator_1.body)("description").optional().trim().notEmpty(),
    (0, express_validator_1.body)("permissionIds").optional().isArray(),
    handleValidation,
], async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        const { description, permissionIds } = req.body;
        const role = await prisma.role.findUnique({
            where: { id },
            include: { permissions: true },
        });
        if (!role) {
            res.status(404).json({
                success: false,
                error: "Role not found",
                code: "ROLE_NOT_FOUND",
            });
            return;
        }
        // Prevent modifying system roles (optional security measure)
        // In this system, all roles are admin-defined, so we allow modifications
        const updateData = {};
        if (description !== undefined)
            updateData.description = description;
        if (permissionIds !== undefined) {
            // Verify all permissions exist
            const permissions = await prisma.permission.findMany({
                where: { id: { in: permissionIds } },
            });
            if (permissions.length !== permissionIds.length) {
                res.status(400).json({
                    success: false,
                    error: "One or more permissions not found",
                    code: "INVALID_PERMISSIONS",
                });
                return;
            }
            updateData.permissions = {
                set: permissionIds.map((pid) => ({ id: pid })),
            };
        }
        const updatedRole = await prisma.role.update({
            where: { id },
            data: updateData,
            include: {
                permissions: true,
            },
        });
        (0, logger_js_1.logAudit)(adminUser.id, "role.update", "roles", id, { name: role.name, changes: updateData }, "success");
        logger_js_1.logger.info(`Role ${role.name} updated by admin ${adminUser.email}`);
        res.json({
            success: true,
            data: { role: updatedRole },
            message: "Role updated successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Update role error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update role",
            code: "UPDATE_ROLE_ERROR",
        });
    }
});
/**
 * DELETE /roles/:id
 * Delete role (Admin only)
 * Note: Role must not have any users assigned
 */
router.delete("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const adminUser = req.user;
        const { id } = req.params;
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });
        if (!role) {
            res.status(404).json({
                success: false,
                error: "Role not found",
                code: "ROLE_NOT_FOUND",
            });
            return;
        }
        // Check if any users have this role
        if (role._count.users > 0) {
            res.status(400).json({
                success: false,
                error: "Cannot delete role with assigned users. Reassign users first.",
                code: "ROLE_IN_USE",
            });
            return;
        }
        await prisma.role.delete({ where: { id } });
        (0, logger_js_1.logAudit)(adminUser.id, "role.delete", "roles", id, { name: role.name }, "success");
        logger_js_1.logger.info(`Role ${role.name} deleted by admin ${adminUser.email}`);
        res.json({
            success: true,
            message: "Role deleted successfully",
        });
    }
    catch (error) {
        logger_js_1.logger.error("Delete role error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete role",
            code: "DELETE_ROLE_ERROR",
        });
    }
});
/**
 * GET /roles/:id/permissions
 * Get permissions for a role (Admin only)
 */
router.get("/:id/permissions", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { id } = req.params;
        const role = await prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    orderBy: { name: "asc" },
                },
            },
        });
        if (!role) {
            res.status(404).json({
                success: false,
                error: "Role not found",
                code: "ROLE_NOT_FOUND",
            });
            return;
        }
        // Get all available permissions (for comparison)
        const allPermissions = await prisma.permission.findMany({
            orderBy: { name: "asc" },
        });
        res.json({
            success: true,
            data: {
                rolePermissions: role.permissions,
                allPermissions,
            },
        });
    }
    catch (error) {
        logger_js_1.logger.error("Get role permissions error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch role permissions",
            code: "FETCH_PERMISSIONS_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=roles.js.map