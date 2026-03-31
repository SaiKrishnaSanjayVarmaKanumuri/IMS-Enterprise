import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requirePermission, requireRole } from "../middleware/rbac.js";
import { logger, logAudit } from "../utils/logger.js";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const prisma = new PrismaClient();

// Request status type (string for SQLite compatibility)
type RequestStatus =
    | "PENDING"
    | "ENGINEER_APPROVED"
    | "ENGINEER_REJECTED"
    | "PROCUREMENT_APPROVED"
    | "PROCUREMENT_REJECTED"
    | "FINANCE_APPROVED"
    | "FINANCE_REJECTED"
    | "COMPLETED"
    | "CANCELLED";

// Role type (string for SQLite compatibility)
type UserRole =
    | "ADMIN"
    | "SITE_ENGINEER"
    | "PROCUREMENT"
    | "FINANCE"
    | "FRONT_MAN";

/**
 * Generate request number
 */
const generateRequestNumber = async (): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const count = await prisma.request.count({
        where: {
            createdAt: {
                gte: new Date(date.getFullYear(), date.getMonth(), 1),
            },
        },
    });
    return `REQ-${year}${month}-${(count + 1).toString().padStart(4, "0")}`;
};

/**
 * POST /requests
 * Create a new material/shifting request
 * Only Front Man (FM) can create requests
 */
router.post(
    "/",
    authenticate,
    requirePermission("requests:create"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const {
                type,
                siteId,
                targetSiteId,
                description,
                justification,
                expectedDate,
                priority,
                items,
            } = req.body;

            // Validate required fields
            if (
                !type ||
                !siteId ||
                !description ||
                !items ||
                items.length === 0
            ) {
                res.status(400).json({
                    success: false,
                    error: "Missing required fields: type, siteId, description, items",
                    code: "MISSING_FIELDS",
                });
                return;
            }

            // Validate site exists
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

            // For shifting requests, validate target site
            if (type === "SHIFTING" && !targetSiteId) {
                res.status(400).json({
                    success: false,
                    error: "Target site is required for shifting requests",
                    code: "MISSING_TARGET_SITE",
                });
                return;
            }

            if (type === "SHIFTING" && targetSiteId === siteId) {
                res.status(400).json({
                    success: false,
                    error: "Target site must be different from source site",
                    code: "INVALID_TARGET_SITE",
                });
                return;
            }

            // Generate request number
            const requestNumber = await generateRequestNumber();

            // Create request with items in transaction
            const request = await prisma.$transaction(async (tx) => {
                // Create request
                const newRequest = await tx.request.create({
                    data: {
                        requestNumber,
                        type,
                        status: "PENDING" as RequestStatus,
                        requesterId: user.id,
                        siteId,
                        targetSiteId: type === "SHIFTING" ? targetSiteId : null,
                        description,
                        justification,
                        expectedDate:
                            expectedDate && expectedDate.trim() !== ""
                                ? new Date(expectedDate)
                                : null,
                        priority: priority || "normal",
                    },
                });

                // Create request items
                await tx.requestItem.createMany({
                    data: items.map(
                        (item: {
                            itemName: string;
                            quantity: number;
                            unit: string;
                            specifications?: string;
                            notes?: string;
                        }) => ({
                            requestId: newRequest.id,
                            itemName: item.itemName,
                            quantity: Number(item.quantity),
                            unitLabel: item.unit || "pcs",   // required field in schema
                            specifications: item.specifications || null,
                            notes: item.notes || null,
                        }),
                    ),
                });

                return newRequest;
            });

            // Log audit
            logAudit(
                user.id,
                "request.create",
                "requests",
                request.id,
                {
                    requestNumber: request.requestNumber,
                    type,
                    siteId,
                    itemCount: items.length,
                },
                "success",
            );

            logger.info(
                `Request ${request.requestNumber} created by ${user.email}`,
            );

            // Fetch created request with items
            const fullRequest = await prisma.request.findUnique({
                where: { id: request.id },
                include: {
                    items: true,
                    site: true,
                    targetSite: true,
                },
            });

            res.status(201).json({
                success: true,
                data: { request: fullRequest },
                message: "Request created successfully",
            });
        } catch (error) {
            logger.error("Create request error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to create request",
                code: "CREATE_REQUEST_ERROR",
            });
        }
    },
);

/**
 * GET /requests
 * Get requests based on role
 * - FM: Only own requests
 * - Engineer: Requests pending approval at their sites
 * - Procurement: Engineer-approved requests
 * - Finance: Procurement-approved requests
 * - Admin: All requests
 */
router.get(
    "/",
    authenticate,
    requirePermission("requests:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const user = req.user!;
            const { status, siteId, type, page = 1, limit = 20 } = req.query;

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            // Get user permissions from request (set by middleware)
            const userPermissions = req.userPermissions || [];

            // Build where clause based on role
            let whereClause: Record<string, unknown> = {};

            switch (user.role) {
                case "FRONT_MAN":
                    // FM can only see their own requests
                    whereClause = {
                        requesterId: user.id,
                    };
                    break;

                case "SITE_ENGINEER":
                    // Engineer sees ALL requests at their assigned sites (pending and processed)
                    whereClause = {
                        site: {
                            assignedUsers: {
                                some: { id: user.id },
                            },
                        },
                    };
                    break;

                case "PROCUREMENT":
                    // Procurement sees engineer-approved requests (and their own processed ones)
                    whereClause = {
                        OR: [
                            { status: "ENGINEER_APPROVED" as RequestStatus },
                            { status: "PROCUREMENT_APPROVED" as RequestStatus },
                            { status: "PROCUREMENT_REJECTED" as RequestStatus },
                            { requesterId: user.id },
                        ],
                    };
                    break;

                case "FINANCE":
                    // Finance sees procurement-approved requests (and their own processed ones)
                    whereClause = {
                        OR: [
                            { status: "PROCUREMENT_APPROVED" as RequestStatus },
                            { status: "FINANCE_APPROVED" as RequestStatus },
                            { status: "FINANCE_REJECTED" as RequestStatus },
                            { requesterId: user.id },
                        ],
                    };
                    break;

                case "ADMIN":
                    // Admin sees all
                    whereClause = {};
                    break;
            }

            // Apply filters
            if (status) {
                whereClause.status = status;
            }
            if (siteId && user.role === "ADMIN") {
                whereClause.siteId = siteId;
            }
            if (type) {
                whereClause.type = type;
            }

            const [requests, total] = await Promise.all([
                prisma.request.findMany({
                    where: whereClause,
                    include: {
                        items: true,
                        site: true,
                        targetSite: true,
                        requester: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                }),
                prisma.request.count({ where: whereClause }),
            ]);

            res.json({
                success: true,
                data: {
                    requests,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / take),
                    },
                },
            });
        } catch (error) {
            logger.error("Get requests error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch requests",
                code: "FETCH_REQUESTS_ERROR",
            });
        }
    },
);

/**
 * GET /requests/:id
 * Get single request by ID
 */
router.get(
    "/:id",
    authenticate,
    requirePermission("requests:read:own"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;

            const request = await prisma.request.findUnique({
                where: { id },
                include: {
                    items: true,
                    site: {
                        include: { assignedUsers: { select: { id: true } } },
                    },
                    targetSite: true,
                    requester: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        },
                    },
                    approvalActions: {
                        include: {
                            approver: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    role: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
            });

            if (!request) {
                res.status(404).json({
                    success: false,
                    error: "Request not found",
                    code: "REQUEST_NOT_FOUND",
                });
                return;
            }

            // Check access based on role
            let hasAccess = false;

            switch (user.role) {
                case "ADMIN":
                    hasAccess = true;
                    break;
                case "FRONT_MAN":
                    hasAccess = request.requesterId === user.id;
                    break;
                case "SITE_ENGINEER":
                    // Engineer can view any request at their assigned sites
                    hasAccess =
                        request.site.assignedUsers?.some(
                            (u) => u.id === user.id,
                        ) || false;
                    break;
                case "PROCUREMENT":
                    hasAccess = request.status === "ENGINEER_APPROVED";
                    break;
                case "FINANCE":
                    hasAccess = request.status === "PROCUREMENT_APPROVED";
                    break;
            }

            if (!hasAccess) {
                logAudit(
                    user.id,
                    "request.access_denied",
                    "requests",
                    id,
                    { role: user.role },
                    "failed",
                );

                res.status(403).json({
                    success: false,
                    error: "Access denied to this request",
                    code: "ACCESS_DENIED",
                });
                return;
            }

            res.json({
                success: true,
                data: { request },
            });
        } catch (error) {
            logger.error("Get request error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch request",
                code: "FETCH_REQUEST_ERROR",
            });
        }
    },
);

/**
 * PATCH /requests/:id/approve
 * Approve request - role-specific workflow
 */
router.patch(
    "/:id/approve",
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;
            const { remarks } = req.body;

            const request = await prisma.request.findUnique({
                where: { id },
                include: {
                    items: true,
                    site: true,
                },
            });

            if (!request) {
                res.status(404).json({
                    success: false,
                    error: "Request not found",
                    code: "REQUEST_NOT_FOUND",
                });
                return;
            }

            // Determine next status based on role
            let nextStatus: RequestStatus | null = null;
            const role = user.role as UserRole;

            switch (role) {
                case "SITE_ENGINEER":
                    if (request.status !== "PENDING") {
                        res.status(400).json({
                            success: false,
                            error: "Request is not pending engineer approval",
                            code: "INVALID_STATUS",
                        });
                        return;
                    }
                    nextStatus = "ENGINEER_APPROVED";
                    break;

                case "PROCUREMENT":
                    if (request.status !== "ENGINEER_APPROVED") {
                        res.status(400).json({
                            success: false,
                            error: "Request is not pending procurement approval",
                            code: "INVALID_STATUS",
                        });
                        return;
                    }
                    nextStatus = "PROCUREMENT_APPROVED";
                    break;

                case "FINANCE":
                    if (request.status !== "PROCUREMENT_APPROVED") {
                        res.status(400).json({
                            success: false,
                            error: "Request is not pending finance approval",
                            code: "INVALID_STATUS",
                        });
                        return;
                    }
                    nextStatus = "FINANCE_APPROVED";
                    break;

                case "ADMIN":
                    // Admin can override at any stage
                    nextStatus = "COMPLETED";
                    break;

                default:
                    res.status(403).json({
                        success: false,
                        error: "Your role cannot approve requests",
                        code: "CANNOT_APPROVE",
                    });
                    return;
            }

            // Update request and log approval
            await prisma.$transaction(async (tx) => {
                // Update status
                await tx.request.update({
                    where: { id },
                    data: { status: nextStatus! },
                });

                // Log approval action
                await tx.approvalAction.create({
                    data: {
                        requestId: id,
                        approverId: user.id,
                        action: "approve",
                        fromStatus: request.status,
                        toStatus: nextStatus!,
                        remarks,
                    },
                });
            });

            logAudit(
                user.id,
                "request.approve",
                "requests",
                id,
                {
                    requestNumber: request.requestNumber,
                    fromStatus: request.status,
                    toStatus: nextStatus,
                    role,
                },
                "success",
            );

            logger.info(
                `Request ${request.requestNumber} approved by ${user.email} (${role})`,
            );

            const updatedRequest = await prisma.request.findUnique({
                where: { id },
                include: {
                    items: true,
                    site: true,
                    approvalActions: {
                        include: {
                            approver: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true,
                                },
                            },
                        },
                    },
                },
            });

            res.json({
                success: true,
                data: { request: updatedRequest },
                message: "Request approved successfully",
            });
        } catch (error) {
            logger.error("Approve request error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to approve request",
                code: "APPROVE_ERROR",
            });
        }
    },
);

/**
 * PATCH /requests/:id/reject
 * Reject request - role-specific workflow
 */
router.patch(
    "/:id/reject",
    authenticate,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;
            const { remarks } = req.body;

            if (!remarks) {
                res.status(400).json({
                    success: false,
                    error: "Rejection reason is required",
                    code: "MISSING_REASON",
                });
                return;
            }

            const request = await prisma.request.findUnique({
                where: { id },
            });

            if (!request) {
                res.status(404).json({
                    success: false,
                    error: "Request not found",
                    code: "REQUEST_NOT_FOUND",
                });
                return;
            }

            // Determine rejection status based on role
            let rejectedStatus: RequestStatus | null = null;
            const role = user.role as UserRole;

            switch (role) {
                case "SITE_ENGINEER":
                    if (request.status !== "PENDING") {
                        res.status(400).json({
                            success: false,
                            error: "Request is not pending engineer review",
                            code: "INVALID_STATUS",
                        });
                        return;
                    }
                    rejectedStatus = "ENGINEER_REJECTED";
                    break;

                case "PROCUREMENT":
                    if (request.status !== "ENGINEER_APPROVED") {
                        res.status(400).json({
                            success: false,
                            error: "Request is not pending procurement review",
                            code: "INVALID_STATUS",
                        });
                        return;
                    }
                    rejectedStatus = "PROCUREMENT_REJECTED";
                    break;

                case "FINANCE":
                    if (request.status !== "PROCUREMENT_APPROVED") {
                        res.status(400).json({
                            success: false,
                            error: "Request is not pending finance review",
                            code: "INVALID_STATUS",
                        });
                        return;
                    }
                    rejectedStatus = "FINANCE_REJECTED";
                    break;

                default:
                    res.status(403).json({
                        success: false,
                        error: "Your role cannot reject requests",
                        code: "CANNOT_REJECT",
                    });
                    return;
            }

            // Update request and log rejection
            await prisma.$transaction(async (tx) => {
                await tx.request.update({
                    where: { id },
                    data: { status: rejectedStatus! },
                });

                await tx.approvalAction.create({
                    data: {
                        requestId: id,
                        approverId: user.id,
                        action: "reject",
                        fromStatus: request.status,
                        toStatus: rejectedStatus!,
                        remarks,
                    },
                });
            });

            logAudit(
                user.id,
                "request.reject",
                "requests",
                id,
                {
                    requestNumber: request.requestNumber,
                    fromStatus: request.status,
                    toStatus: rejectedStatus,
                    role,
                    remarks,
                },
                "success",
            );

            logger.info(
                `Request ${request.requestNumber} rejected by ${user.email} (${role})`,
            );

            res.json({
                success: true,
                message: "Request rejected",
            });
        } catch (error) {
            logger.error("Reject request error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to reject request",
                code: "REJECT_ERROR",
            });
        }
    },
);

/**
 * PATCH /requests/:id/cancel
 * Cancel request (FM only, for pending requests)
 */
router.patch(
    "/:id/cancel",
    authenticate,
    requirePermission("requests:cancel"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;
            const { reason } = req.body;

            const request = await prisma.request.findUnique({
                where: { id },
            });

            if (!request) {
                res.status(404).json({
                    success: false,
                    error: "Request not found",
                    code: "REQUEST_NOT_FOUND",
                });
                return;
            }

            // Only requester can cancel, and only if pending
            if (request.requesterId !== user.id) {
                res.status(403).json({
                    success: false,
                    error: "Only the requester can cancel this request",
                    code: "NOT_REQUESTER",
                });
                return;
            }

            if (request.status !== "PENDING") {
                res.status(400).json({
                    success: false,
                    error: "Only pending requests can be cancelled",
                    code: "INVALID_STATUS",
                });
                return;
            }

            await prisma.$transaction(async (tx) => {
                await tx.request.update({
                    where: { id },
                    data: { status: "CANCELLED" as RequestStatus },
                });

                await tx.approvalAction.create({
                    data: {
                        requestId: id,
                        approverId: user.id,
                        action: "cancel",
                        fromStatus: request.status,
                        toStatus: "CANCELLED" as RequestStatus,
                        remarks: reason,
                    },
                });
            });

            logAudit(
                user.id,
                "request.cancel",
                "requests",
                id,
                { requestNumber: request.requestNumber, reason },
                "success",
            );

            logger.info(
                `Request ${request.requestNumber} cancelled by ${user.email}`,
            );

            res.json({
                success: true,
                message: "Request cancelled",
            });
        } catch (error) {
            logger.error("Cancel request error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to cancel request",
                code: "CANCEL_ERROR",
            });
        }
    },
);

/**
 * PATCH /requests/:id/procurement
 * Update procurement details (Procurement only)
 */
router.patch(
    "/:id/procurement",
    authenticate,
    requirePermission("procurement:assign-vendor"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const user = req.user!;
            const {
                vendorId,
                vendorName,
                poNumber,
                procurementNotes,
                actualCost,
            } = req.body;

            const request = await prisma.request.findUnique({
                where: { id },
            });

            if (!request) {
                res.status(404).json({
                    success: false,
                    error: "Request not found",
                    code: "REQUEST_NOT_FOUND",
                });
                return;
            }

            // Only engineer-approved requests can have procurement details
            if (request.status !== "ENGINEER_APPROVED") {
                res.status(400).json({
                    success: false,
                    error: "Request must be engineer-approved first",
                    code: "INVALID_STATUS",
                });
                return;
            }

            const updatedRequest = await prisma.request.update({
                where: { id },
                data: {
                    vendorId,
                    vendorName,
                    poNumber,
                    procurementNotes,
                    actualCost,
                },
            });

            logAudit(
                user.id,
                "request.procurement_update",
                "requests",
                id,
                { vendorId, vendorName, poNumber },
                "success",
            );

            res.json({
                success: true,
                data: { request: updatedRequest },
                message: "Procurement details updated",
            });
        } catch (error) {
            logger.error("Procurement update error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to update procurement details",
                code: "PROCUREMENT_UPDATE_ERROR",
            });
        }
    },
);

export default router;
