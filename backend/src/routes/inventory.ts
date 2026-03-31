import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { requirePermission, requireRole } from "../middleware/rbac.js";
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

// Role types
type UserRole =
    | "ADMIN"
    | "SITE_ENGINEER"
    | "PROCUREMENT"
    | "FINANCE"
    | "FRONT_MAN";

/**
 * Check if user has specific permission
 */
const hasPermission = (
    userPermissions: string[],
    requiredPermission: string,
): boolean => {
    // Admin has all permissions
    if (userPermissions.includes("*")) {
        return true;
    }

    // Check for exact match
    if (userPermissions.includes(requiredPermission)) {
        return true;
    }

    // Check for wildcard action
    const [resource, action] = requiredPermission.split(":");
    if (userPermissions.includes(`${resource}:*`)) {
        return true;
    }

    return false;
};

/**
 * Check if user can access all sites
 */
const canAccessAllSites = (role: string, permissions: string[]): boolean => {
    return (
        role === "ADMIN" ||
        role === "PROCUREMENT" ||
        role === "FINANCE" ||
        hasPermission(permissions, "inventory:read:all")
    );
};

/**
 * GET /inventory
 * Get inventory items
 * - ADMIN/PROCUREMENT/FINANCE: All sites
 * - Others: Only assigned sites
 */
router.get(
    "/",
    authenticate,
    requirePermission("inventory:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const userPermissions = req.userPermissions || [];
            const {
                siteId,
                category,
                search,
                page = "1",
                limit = "20",
            } = req.query;

            const skip =
                (parseInt(page as string) - 1) * parseInt(limit as string);
            const take = parseInt(limit as string);

            // Build where clause
            const where: Record<string, unknown> = {};

            // Filter by site if specified
            if (siteId) {
                where.siteId = siteId;
            } else if (!canAccessAllSites(user.role, userPermissions)) {
                // Non-privileged users can only see their assigned sites
                where.site = {
                    assignedUsers: {
                        some: { id: user.id },
                    },
                };
            }

            // Filter by category
            if (category) {
                where.category = category;
            }

            // Search by name or code
            if (search) {
                where.OR = [
                    { name: { contains: search as string } },
                    { code: { contains: search as string } },
                ];
            }

            const [items, total] = await Promise.all([
                prisma.inventoryItem.findMany({
                    where,
                    include: {
                        site: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                        _count: {
                            select: { movements: true, alerts: true },
                        },
                    },
                    orderBy: [{ category: "asc" }, { name: "asc" }],
                    skip,
                    take,
                }),
                prisma.inventoryItem.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    items,
                    pagination: {
                        page: parseInt(page as string),
                        limit: take,
                        total,
                        totalPages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            logger.error("Get inventory error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch inventory",
                code: "FETCH_INVENTORY_ERROR",
            });
        }
    },
);

/**
 * GET /inventory/:id
 * Get single inventory item
 */
router.get(
    "/:id",
    authenticate,
    requirePermission("inventory:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;
            const userPermissions = req.userPermissions || [];

            const item = await prisma.inventoryItem.findUnique({
                where: { id },
                include: {
                    site: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            assignedUsers: {
                                select: { id: true },
                            },
                        },
                    },
                },
            });

            if (!item) {
                res.status(404).json({
                    success: false,
                    error: "Inventory item not found",
                    code: "ITEM_NOT_FOUND",
                });
                return;
            }

            // Check access for non-admin users
            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = item.site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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
                data: { item },
            });
        } catch (error) {
            logger.error("Get inventory item error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch inventory item",
                code: "FETCH_ITEM_ERROR",
            });
        }
    },
);

/**
 * POST /inventory
 * Create new inventory item (site members)
 */
router.post(
    "/",
    authenticate,
    requirePermission("inventory:create"),
    [
        body("name").trim().notEmpty(),
        body("code").trim().notEmpty().isLength({ min: 2, max: 20 }),
        body("category").trim().notEmpty(),
        body("unit").trim().notEmpty(),
        body("siteId").notEmpty(),
        body("minimumStock").optional().isNumeric(),
        body("maximumStock").optional().isNumeric(),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const {
                name,
                code,
                category,
                unit,
                siteId,
                minimumStock,
                maximumStock,
                description,
                specifications,
                location,
            } = req.body;

            // Verify site exists and user has access
            const site = await prisma.site.findUnique({
                where: { id: siteId },
                include: {
                    assignedUsers: { select: { id: true } },
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

            // Check if user is assigned to site (unless admin/procurement/finance)
            const userPermissions = req.userPermissions || [];
            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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

            // Check if item code already exists at this site
            const existingItem = await prisma.inventoryItem.findUnique({
                where: {
                    siteId_code: {
                        siteId,
                        code: code.toUpperCase(),
                    },
                },
            });

            if (existingItem) {
                res.status(409).json({
                    success: false,
                    error: "Item with this code already exists at the site",
                    code: "CODE_EXISTS",
                });
                return;
            }

            const item = await prisma.inventoryItem.create({
                data: {
                    name,
                    code: code.toUpperCase(),
                    category,
                    unit,
                    siteId,
                    minimumStock: minimumStock || 0,
                    maximumStock: maximumStock || null,
                    description,
                    specifications,
                    location,
                },
                include: {
                    site: {
                        select: { id: true, name: true, code: true },
                    },
                },
            });

            logAudit(
                user.id,
                "inventory.create",
                "inventory",
                item.id,
                {
                    name: item.name,
                    code: item.code,
                    siteId,
                    siteCode: site.code,
                },
                "success",
            );

            logger.info(
                `Inventory item ${item.name} (${item.code}) created at site ${site.code} by ${user.email}`,
            );

            res.status(201).json({
                success: true,
                data: { item },
                message: "Inventory item created successfully",
            });
        } catch (error) {
            logger.error("Create inventory error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create inventory item",
                code: "CREATE_INVENTORY_ERROR",
            });
        }
    },
);

/**
 * POST /inventory/:id/movement
 * Add or consume stock
 */
router.post(
    "/:id/movement",
    authenticate,
    requirePermission("inventory:create"),
    [
        body("type").isIn(["ADD", "CONSUME"]),
        body("quantity").isFloat({ min: 0.0001 }),
        body("reason").optional().trim(),
        body("reference").optional().trim(),
        body("notes").optional().trim(),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { id } = req.params;
            const { type, quantity, reason, reference, notes } = req.body;

            // Get inventory item with site info
            const item = await prisma.inventoryItem.findUnique({
                where: { id },
                include: {
                    site: {
                        select: {
                            id: true,
                            code: true,
                            assignedUsers: { select: { id: true } },
                        },
                    },
                },
            });

            if (!item) {
                res.status(404).json({
                    success: false,
                    error: "Inventory item not found",
                    code: "ITEM_NOT_FOUND",
                });
                return;
            }

            // Check access
            const userPermissions = req.userPermissions || [];
            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = item.site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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

            // Validate stock availability for consumption
            if (type === "CONSUME" && item.currentStock < quantity) {
                res.status(400).json({
                    success: false,
                    error: `Insufficient stock. Available: ${item.currentStock} ${item.unit}`,
                    code: "INSUFFICIENT_STOCK",
                });
                return;
            }

            // Calculate new stock
            const previousStock = item.currentStock;
            const newStock =
                type === "ADD"
                    ? previousStock + quantity
                    : previousStock - quantity;

            // Create movement and update stock in transaction
            const result = await prisma.$transaction(async (tx) => {
                // Create movement record
                const movement = await tx.stockMovement.create({
                    data: {
                        type,
                        quantity,
                        previousStock,
                        newStock,
                        inventoryItemId: id,
                        performedById: user.id,
                        siteId: item.site.id,
                        reason,
                        reference,
                        notes,
                    },
                });

                // Update inventory item stock
                const updatedItem = await tx.inventoryItem.update({
                    where: { id },
                    data: { currentStock: newStock },
                    include: {
                        site: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                });

                // Check for low stock and create alert if needed
                if (
                    newStock <= updatedItem.minimumStock &&
                    updatedItem.minimumStock > 0
                ) {
                    // Deactivate existing alerts for this item
                    await tx.alert.updateMany({
                        where: {
                            inventoryItemId: id,
                            isActive: true,
                            type: "low_stock",
                        },
                        data: { isActive: false },
                    });

                    // Create new alert
                    await tx.alert.create({
                        data: {
                            type: "low_stock",
                            severity: newStock === 0 ? "critical" : "warning",
                            message: `Low stock alert: ${updatedItem.name} (${updatedItem.code}) is below minimum. Current: ${newStock} ${updatedItem.unit}, Minimum: ${updatedItem.minimumStock} ${updatedItem.unit}`,
                            inventoryItemId: id,
                        },
                    });
                }

                return { movement, item: updatedItem };
            });

            logAudit(
                user.id,
                `inventory.${type.toLowerCase()}`,
                "inventory",
                id,
                {
                    itemName: item.name,
                    quantity,
                    previousStock,
                    newStock,
                    reason,
                    reference,
                    siteId: item.site.id,
                    siteCode: item.site.code,
                },
                "success",
            );

            logger.info(
                `${type} ${quantity} ${item.unit} of ${item.name} at site ${item.site.code} by ${user.email}`,
            );

            res.json({
                success: true,
                data: {
                    movement: result.movement,
                    item: result.item,
                },
                message: `Stock ${type === "ADD" ? "added" : "consumed"} successfully`,
            });
        } catch (error) {
            logger.error("Stock movement error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to process stock movement",
                code: "MOVEMENT_ERROR",
            });
        }
    },
);

/**
 * GET /inventory/alerts/low-stock
 * Get low stock alerts
 */
router.get(
    "/alerts/low-stock",
    authenticate,
    requirePermission("inventory:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const userPermissions = req.userPermissions || [];
            const { siteId, isRead, severity } = req.query;

            // Build where clause for items below minimum stock
            let itemWhere: Record<string, unknown> = {};

            if (!canAccessAllSites(user.role, userPermissions)) {
                itemWhere.site = {
                    assignedUsers: {
                        some: { id: user.id },
                    },
                };
            }

            if (siteId) {
                itemWhere.siteId = siteId;
            }

            // Get all items
            const items = await prisma.inventoryItem.findMany({
                where: itemWhere,
                include: {
                    site: {
                        select: { id: true, name: true, code: true },
                    },
                    alerts: {
                        where: {
                            type: "low_stock",
                            isActive: true,
                        },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            });

            // Manual filter for items below minimum stock
            const lowStockItems = items.filter(
                (item) =>
                    item.currentStock <= item.minimumStock &&
                    item.minimumStock > 0,
            );

            // Build alerts where clause
            const alertsWhere: Record<string, unknown> = {
                type: "low_stock",
                isActive: true,
            };

            if (!canAccessAllSites(user.role, userPermissions)) {
                alertsWhere.inventoryItem = {
                    site: {
                        assignedUsers: {
                            some: { id: user.id },
                        },
                    },
                };
            }

            if (siteId) {
                alertsWhere.inventoryItem = {
                    ...(alertsWhere.inventoryItem as object),
                    siteId,
                };
            }

            if (isRead !== undefined) {
                alertsWhere.isRead = isRead === "true";
            }

            if (severity) {
                alertsWhere.severity = severity;
            }

            const [alerts, unreadCount] = await Promise.all([
                prisma.alert.findMany({
                    where: alertsWhere,
                    include: {
                        inventoryItem: {
                            include: {
                                site: {
                                    select: {
                                        id: true,
                                        name: true,
                                        code: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
                    take: 100,
                }),
                prisma.alert.count({
                    where: { ...alertsWhere, isRead: false },
                }),
            ]);

            res.json({
                success: true,
                data: {
                    alerts,
                    lowStockItems,
                    unreadCount,
                },
            });
        } catch (error) {
            logger.error("Get low stock alerts error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch low stock alerts",
                code: "FETCH_ALERTS_ERROR",
            });
        }
    },
);

/**
 * GET /inventory/history
 * Get stock movement history
 */
router.get(
    "/history",
    authenticate,
    requirePermission("inventory:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const userPermissions = req.userPermissions || [];
            const {
                inventoryItemId,
                siteId,
                type,
                startDate,
                endDate,
                page = "1",
                limit = "50",
            } = req.query;

            const skip =
                (parseInt(page as string) - 1) * parseInt(limit as string);
            const take = parseInt(limit as string);

            // Build where clause
            const where: Record<string, unknown> = {};

            if (inventoryItemId) {
                where.inventoryItemId = inventoryItemId;
            }

            if (siteId) {
                where.siteId = siteId;
            } else if (!canAccessAllSites(user.role, userPermissions)) {
                where.site = {
                    assignedUsers: {
                        some: { id: user.id },
                    },
                };
            }

            if (type) {
                where.type = type;
            }

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) {
                    (where.createdAt as Record<string, Date>).gte = new Date(
                        startDate as string,
                    );
                }
                if (endDate) {
                    (where.createdAt as Record<string, Date>).lte = new Date(
                        endDate as string,
                    );
                }
            }

            const [movements, total] = await Promise.all([
                prisma.stockMovement.findMany({
                    where,
                    include: {
                        inventoryItem: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                unit: true,
                            },
                        },
                        performedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                            },
                        },
                        site: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                }),
                prisma.stockMovement.count({ where }),
            ]);

            res.json({
                success: true,
                data: {
                    movements,
                    pagination: {
                        page: parseInt(page as string),
                        limit: take,
                        total,
                        totalPages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            logger.error("Get stock history error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch stock history",
                code: "FETCH_HISTORY_ERROR",
            });
        }
    },
);

/**
 * GET /inventory/:id/history
 * Get movement history for specific item
 */
router.get(
    "/:id/history",
    authenticate,
    requirePermission("inventory:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;
            const userPermissions = req.userPermissions || [];
            const { page = "1", limit = "20" } = req.query;

            const skip =
                (parseInt(page as string) - 1) * parseInt(limit as string);
            const take = parseInt(limit as string);

            // Verify item exists and user has access
            const item = await prisma.inventoryItem.findUnique({
                where: { id },
                include: {
                    site: {
                        select: {
                            id: true,
                            code: true,
                            assignedUsers: { select: { id: true } },
                        },
                    },
                },
            });

            if (!item) {
                res.status(404).json({
                    success: false,
                    error: "Inventory item not found",
                    code: "ITEM_NOT_FOUND",
                });
                return;
            }

            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = item.site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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

            const [movements, total] = await Promise.all([
                prisma.stockMovement.findMany({
                    where: { inventoryItemId: id },
                    include: {
                        performedBy: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                role: true,
                            },
                        },
                        site: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                }),
                prisma.stockMovement.count({ where: { inventoryItemId: id } }),
            ]);

            res.json({
                success: true,
                data: {
                    item: {
                        id: item.id,
                        name: item.name,
                        code: item.code,
                        unit: item.unit,
                        currentStock: item.currentStock,
                        minimumStock: item.minimumStock,
                    },
                    movements,
                    pagination: {
                        page: parseInt(page as string),
                        limit: take,
                        total,
                        totalPages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            logger.error("Get item history error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch item history",
                code: "FETCH_ITEM_HISTORY_ERROR",
            });
        }
    },
);

/**
 * PATCH /inventory/:id
 * Update inventory item
 */
router.patch(
    "/:id",
    authenticate,
    requirePermission("inventory:create"),
    [
        body("name").optional().trim().notEmpty(),
        body("minimumStock").optional().isNumeric(),
        body("maximumStock").optional().isNumeric(),
        body("description").optional().trim(),
        body("specifications").optional().trim(),
        body("location").optional().trim(),
        handleValidation,
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { id } = req.params;
            const {
                name,
                minimumStock,
                maximumStock,
                description,
                specifications,
                location,
            } = req.body;

            const item = await prisma.inventoryItem.findUnique({
                where: { id },
                include: {
                    site: {
                        select: {
                            id: true,
                            code: true,
                            assignedUsers: { select: { id: true } },
                        },
                    },
                },
            });

            if (!item) {
                res.status(404).json({
                    success: false,
                    error: "Inventory item not found",
                    code: "ITEM_NOT_FOUND",
                });
                return;
            }

            // Check access
            const userPermissions = req.userPermissions || [];
            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = item.site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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

            const updateData: Record<string, unknown> = {};
            if (name !== undefined) updateData.name = name;
            if (minimumStock !== undefined)
                updateData.minimumStock = minimumStock;
            if (maximumStock !== undefined)
                updateData.maximumStock = maximumStock;
            if (description !== undefined) updateData.description = description;
            if (specifications !== undefined)
                updateData.specifications = specifications;
            if (location !== undefined) updateData.location = location;

            const updatedItem = await prisma.inventoryItem.update({
                where: { id },
                data: updateData,
                include: {
                    site: {
                        select: { id: true, name: true, code: true },
                    },
                },
            });

            logAudit(
                user.id,
                "inventory.update",
                "inventory",
                id,
                {
                    changes: updateData,
                    siteId: item.site.id,
                    siteCode: item.site.code,
                },
                "success",
            );

            logger.info(
                `Inventory item ${item.name} updated at site ${item.site.code} by ${user.email}`,
            );

            res.json({
                success: true,
                data: { item: updatedItem },
                message: "Inventory item updated successfully",
            });
        } catch (error) {
            logger.error("Update inventory error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update inventory item",
                code: "UPDATE_INVENTORY_ERROR",
            });
        }
    },
);

/**
 * DELETE /inventory/:id
 * Delete inventory item (only if stock is 0)
 */
router.delete(
    "/:id",
    authenticate,
    requirePermission("inventory:create"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { id } = req.params;

            const item = await prisma.inventoryItem.findUnique({
                where: { id },
                include: {
                    site: {
                        select: {
                            id: true,
                            code: true,
                            assignedUsers: { select: { id: true } },
                        },
                    },
                },
            });

            if (!item) {
                res.status(404).json({
                    success: false,
                    error: "Inventory item not found",
                    code: "ITEM_NOT_FOUND",
                });
                return;
            }

            // Check access
            const userPermissions = req.userPermissions || [];
            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = item.site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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

            // Can only delete if stock is 0
            if (item.currentStock > 0) {
                res.status(400).json({
                    success: false,
                    error: "Cannot delete item with remaining stock",
                    code: "HAS_STOCK",
                });
                return;
            }

            await prisma.inventoryItem.delete({ where: { id } });

            logAudit(
                user.id,
                "inventory.delete",
                "inventory",
                id,
                {
                    name: item.name,
                    code: item.code,
                    siteId: item.site.id,
                    siteCode: item.site.code,
                },
                "success",
            );

            logger.info(
                `Inventory item ${item.name} deleted from site ${item.site.code} by ${user.email}`,
            );

            res.json({
                success: true,
                message: "Inventory item deleted successfully",
            });
        } catch (error) {
            logger.error("Delete inventory error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to delete inventory item",
                code: "DELETE_INVENTORY_ERROR",
            });
        }
    },
);

/**
 * PATCH /inventory/alerts/:id/read
 * Mark alert as read
 */
router.patch(
    "/alerts/:id/read",
    authenticate,
    requirePermission("inventory:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { id } = req.params;

            const alert = await prisma.alert.findUnique({
                where: { id },
                include: {
                    inventoryItem: {
                        include: {
                            site: {
                                select: {
                                    id: true,
                                    assignedUsers: { select: { id: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (!alert) {
                res.status(404).json({
                    success: false,
                    error: "Alert not found",
                    code: "ALERT_NOT_FOUND",
                });
                return;
            }

            // Check access
            const userPermissions = req.userPermissions || [];
            if (!canAccessAllSites(user.role, userPermissions)) {
                const isAssigned = alert.inventoryItem.site.assignedUsers.some(
                    (u: { id: string }) => u.id === user.id,
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

            await prisma.alert.update({
                where: { id },
                data: { isRead: true },
            });

            res.json({
                success: true,
                message: "Alert marked as read",
            });
        } catch (error) {
            logger.error("Mark alert read error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to mark alert as read",
                code: "ALERT_ERROR",
            });
        }
    },
);

/**
 * POST /inventory/transfer
 * Transfer stock from one site to another
 */
router.post(
    "/transfer",
    authenticate,
    requirePermission("inventory:create"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { fromSiteId, toSiteId, itemId, quantity, reason } = req.body;

            if (!fromSiteId || !toSiteId || !itemId || !quantity) {
                res.status(400).json({ success: false, error: "Missing required fields: fromSiteId, toSiteId, itemId, quantity" });
                return;
            }

            if (fromSiteId === toSiteId) {
                res.status(400).json({ success: false, error: "Source and destination sites must be different" });
                return;
            }

            const qty = Number(quantity);
            if (isNaN(qty) || qty <= 0) {
                res.status(400).json({ success: false, error: "Quantity must be a positive number" });
                return;
            }

            // Find the inventory item at source site
            const sourceItem = await prisma.inventoryItem.findUnique({
                where: { id: itemId },
                include: { site: { select: { id: true, code: true } } },
            });

            if (!sourceItem) {
                res.status(404).json({ success: false, error: "Inventory item not found" });
                return;
            }

            if (sourceItem.siteId !== fromSiteId) {
                res.status(400).json({ success: false, error: "Item does not belong to the source site" });
                return;
            }

            if (sourceItem.currentStock < qty) {
                res.status(400).json({ success: false, error: `Insufficient stock. Available: ${sourceItem.currentStock} ${sourceItem.unit}` });
                return;
            }

            // Check if same item (by code) exists at destination
            let destItem = await prisma.inventoryItem.findUnique({
                where: { siteId_code: { siteId: toSiteId, code: sourceItem.code } },
            });

            await prisma.$transaction(async (tx) => {
                // Deduct from source
                await tx.inventoryItem.update({
                    where: { id: sourceItem.id },
                    data: { currentStock: { decrement: qty } },
                });

                await tx.stockMovement.create({
                    data: {
                        type: "TRANSFER_OUT",
                        quantity: qty,
                        previousStock: sourceItem.currentStock,
                        newStock: sourceItem.currentStock - qty,
                        inventoryItemId: sourceItem.id,
                        performedById: user.id,
                        siteId: fromSiteId,
                        reason: reason || "Site transfer",
                        reference: `TRANSFER→${toSiteId}`,
                    },
                });

                // Add to destination (create item if missing)
                if (!destItem) {
                    destItem = await tx.inventoryItem.create({
                        data: {
                            name: sourceItem.name,
                            code: sourceItem.code,
                            category: sourceItem.category,
                            unit: sourceItem.unit,
                            siteId: toSiteId,
                            currentStock: qty,
                            minimumStock: sourceItem.minimumStock,
                        },
                    });
                } else {
                    await tx.inventoryItem.update({
                        where: { id: destItem.id },
                        data: { currentStock: { increment: qty } },
                    });
                }

                await tx.stockMovement.create({
                    data: {
                        type: "TRANSFER_IN",
                        quantity: qty,
                        previousStock: destItem.currentStock,
                        newStock: destItem.currentStock + qty,
                        inventoryItemId: destItem.id,
                        performedById: user.id,
                        siteId: toSiteId,
                        reason: reason || "Site transfer",
                        reference: `TRANSFER←${fromSiteId}`,
                    },
                });
            });

            logger.info(`Transfer ${qty} ${sourceItem.unit} of ${sourceItem.name} from site ${fromSiteId} to ${toSiteId} by ${user.email}`);
            res.json({ success: true, message: "Stock transferred successfully" });
        } catch (error) {
            logger.error("Transfer error:", error);
            res.status(500).json({ success: false, error: "Failed to transfer stock" });
        }
    },
);

/**
 * POST /inventory/adjust
 * Adjust (correct) stock count for an item
 */
router.post(
    "/adjust",
    authenticate,
    requirePermission("inventory:create"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { itemId, newQuantity, reason, notes } = req.body;

            if (!itemId || newQuantity === undefined || !reason) {
                res.status(400).json({ success: false, error: "Missing required fields: itemId, newQuantity, reason" });
                return;
            }

            const newQty = Number(newQuantity);
            if (isNaN(newQty) || newQty < 0) {
                res.status(400).json({ success: false, error: "newQuantity must be 0 or positive" });
                return;
            }

            const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
            if (!item) {
                res.status(404).json({ success: false, error: "Inventory item not found" });
                return;
            }

            const diff = newQty - item.currentStock;
            const movementType = "ADJUSTMENT";

            await prisma.$transaction(async (tx) => {
                await tx.inventoryItem.update({
                    where: { id: itemId },
                    data: { currentStock: newQty },
                });
                await tx.stockMovement.create({
                    data: {
                        type: movementType,
                        quantity: Math.abs(diff),
                        previousStock: item.currentStock,
                        newStock: newQty,
                        inventoryItemId: itemId,
                        performedById: user.id,
                        siteId: item.siteId,
                        reason,
                        notes,
                    },
                });
            });

            logger.info(`Inventory adjusted for ${item.name}: ${item.currentStock} → ${newQty} by ${user.email}`);
            res.json({ success: true, message: "Inventory adjusted successfully", data: { previousStock: item.currentStock, newStock: newQty, diff } });
        } catch (error) {
            logger.error("Adjust error:", error);
            res.status(500).json({ success: false, error: "Failed to adjust inventory" });
        }
    },
);

export default router;
