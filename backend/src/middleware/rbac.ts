import { Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import { logger, logAudit } from "../utils/logger.js";

const prisma = new PrismaClient();

// User role type (matching database string values)
export type UserRole =
    | "ADMIN"
    | "SITE_ENGINEER"
    | "PROCUREMENT"
    | "FINANCE"
    | "FRONT_MAN";

// User role values for validation
export const UserRoles: UserRole[] = [
    "ADMIN",
    "SITE_ENGINEER",
    "PROCUREMENT",
    "FINANCE",
    "FRONT_MAN",
];

// Request status type (matching database string values)
export type RequestStatus =
    | "PENDING"
    | "ENGINEER_APPROVED"
    | "ENGINEER_REJECTED"
    | "PROCUREMENT_APPROVED"
    | "PROCUREMENT_REJECTED"
    | "FINANCE_APPROVED"
    | "FINANCE_REJECTED"
    | "COMPLETED"
    | "CANCELLED";

// Request status values for validation
export const RequestStatuses: RequestStatus[] = [
    "PENDING",
    "ENGINEER_APPROVED",
    "ENGINEER_REJECTED",
    "PROCUREMENT_APPROVED",
    "PROCUREMENT_REJECTED",
    "FINANCE_APPROVED",
    "FINANCE_REJECTED",
    "COMPLETED",
    "CANCELLED",
];

// Extended Request type with permission info
declare global {
    namespace Express {
        interface Request {
            userPermissions?: string[];
        }
    }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * IMPORTANT: All role definitions are locked and managed exclusively by Admin.
 * Users cannot change roles or permissions - only Admin can assign roles.
 *
 * Permission format: "resource:action" or "resource:action:detail"
 * Examples: "requests:create", "requests:approve:engineer", "users:read"
 */

// Role to permission mapping (fallback if database lookup fails)
const roleDefaultPermissions: Record<UserRole, string[]> = {
    ADMIN: [
        // Admin has all permissions
        "*",
        "inventory:read:all",
    ],
    SITE_ENGINEER: [
        "auth:login",
        "sites:read",
        "requests:read:own",
        "requests:read:approval",
        "requests:update",
        "requests:approve:engineer",
        "requests:reject:engineer",
        "inventory:read:own",
        "inventory:create",
    ],
    PROCUREMENT: [
        "auth:login",
        "requests:read:approval",
        "requests:approve:procurement",
        "requests:reject:procurement",
        "procurement:assign-vendor",
        "procurement:create-po",
        "procurement:update-delivery",
        "inventory:read:all",
    ],
    FINANCE: [
        "auth:login",
        "requests:read:approval",
        "requests:approve:finance",
        "requests:reject:finance",
        "finance:review-cost",
        "finance:approve-budget",
        "inventory:read:all",
    ],
    FRONT_MAN: [
        "auth:login",
        "sites:read",
        "requests:create",
        "requests:read:own",
        "requests:update",
        "requests:cancel",
        "inventory:read:own",
        "inventory:create",
    ],
};

/**
 * Check if user has required permission
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

    // Check for wildcard action (e.g., "requests:*" matches "requests:create")
    const [resource, action] = requiredPermission.split(":");
    if (userPermissions.includes(`${resource}:*`)) {
        return true;
    }

    // Check for partial wildcards
    for (const userPerm of userPermissions) {
        if (userPerm.endsWith(":*") && userPerm.startsWith(`${resource}:`)) {
            return true;
        }
    }

    return false;
};

/**
 * RBAC Middleware Factory
 * Creates middleware to check specific permissions
 */
export const requirePermission = (permission: string) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const user = req.user;

            if (!user) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                    code: "NOT_AUTHENTICATED",
                });
                return;
            }

            // Get user's permissions from database
            // Note: Permissions are assigned by Admin and stored in the database
            const userWithRole = await prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    roleObj: {
                        include: {
                            permissions: true,
                        },
                    },
                },
            });

            if (!userWithRole || !userWithRole.roleObj) {
                logAudit(
                    user.id,
                    "rbac.user_not_found",
                    "rbac",
                    undefined,
                    { email: user.email },
                    "failed",
                );
                res.status(403).json({
                    success: false,
                    error: "User role not found",
                    code: "ROLE_NOT_FOUND",
                });
                return;
            }

            if (!userWithRole.isActive) {
                logAudit(
                    user.id,
                    "rbac.inactive_user",
                    "rbac",
                    undefined,
                    { email: user.email },
                    "failed",
                );
                res.status(403).json({
                    success: false,
                    error: "Account is deactivated",
                    code: "ACCOUNT_DEACTIVATED",
                });
                return;
            }

            // Extract permission names
            const userPermissions = userWithRole.roleObj.permissions.map(
                (p: { name: string }) => p.name,
            );

            // Store permissions in request for downstream use
            req.userPermissions = userPermissions;

            // Check permission
            if (!hasPermission(userPermissions, permission)) {
                logAudit(
                    user.id,
                    "rbac.access_denied",
                    "rbac",
                    undefined,
                    {
                        email: user.email,
                        role: user.role,
                        requiredPermission: permission,
                        userPermissions,
                    },
                    "failed",
                );

                logger.warn(
                    `Access denied: User ${user.email} (${user.role}) lacks permission ${permission}`,
                );

                res.status(403).json({
                    success: false,
                    error: "You do not have permission to perform this action",
                    code: "ACCESS_DENIED",
                    required: permission,
                });
                return;
            }

            next();
        } catch (error) {
            logger.error("RBAC middleware error:", error);
            res.status(500).json({
                success: false,
                error: "Authorization check failed",
                code: "RBAC_ERROR",
            });
        }
    };
};

/**
 * RBAC Middleware for role-based access
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const user = req.user;

            if (!user) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                    code: "NOT_AUTHENTICATED",
                });
                return;
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(user.role as UserRole)) {
                logAudit(
                    user.id,
                    "rbac.role_denied",
                    "rbac",
                    undefined,
                    {
                        email: user.email,
                        userRole: user.role,
                        requiredRoles: allowedRoles,
                    },
                    "failed",
                );

                logger.warn(
                    `Role access denied: User ${user.email} with role ${user.role} tried to access resource requiring ${allowedRoles.join(" or ")}`,
                );

                res.status(403).json({
                    success: false,
                    error: "Your role does not allow access to this resource",
                    code: "ROLE_DENIED",
                    requiredRoles: allowedRoles,
                });
                return;
            }

            next();
        } catch (error) {
            logger.error("Role middleware error:", error);
            res.status(500).json({
                success: false,
                error: "Authorization check failed",
                code: "ROLE_CHECK_ERROR",
            });
        }
    };
};

/**
 * Get all permissions for a role (Admin use only)
 */
export const getRolePermissions = async (
    roleName: string,
): Promise<string[]> => {
    const role = await prisma.role.findUnique({
        where: { name: roleName as UserRole },
        include: {
            permissions: true,
        },
    });

    if (!role) {
        return [];
    }

    return role.permissions.map((p) => p.name);
};

/**
 * Check if user can perform specific action on request
 * Used for workflow approval checks
 */
export const canApproveRequest = async (
    userId: string,
    currentStatus: string,
): Promise<{ can: boolean; permission: string }> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roleObj: {
                include: {
                    permissions: true,
                },
            },
        },
    });

    if (!user || !user.roleObj) {
        return { can: false, permission: "" };
    }

    const permissions = user.roleObj.permissions.map((p) => p.name);

    // Define workflow permissions based on status
    const workflowPermissions: Record<string, string> = {
        PENDING: "requests:approve:engineer",
        ENGINEER_APPROVED: "requests:approve:procurement",
        PROCUREMENT_APPROVED: "requests:approve:finance",
    };

    const requiredPermission =
        workflowPermissions[currentStatus as RequestStatus];

    if (!requiredPermission) {
        return { can: false, permission: "" };
    }

    const can =
        hasPermission(permissions, requiredPermission) ||
        hasPermission(permissions, "requests:approve:admin");

    return { can, permission: requiredPermission };
};

export default {
    requirePermission,
    requireRole,
    getRolePermissions,
    canApproveRequest,
};
