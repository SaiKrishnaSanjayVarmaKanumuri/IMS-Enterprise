import { Response, NextFunction } from "express";
import { Request } from "express";
export type UserRole = "ADMIN" | "SITE_ENGINEER" | "PROCUREMENT" | "FINANCE" | "FRONT_MAN";
export declare const UserRoles: UserRole[];
export type RequestStatus = "PENDING" | "ENGINEER_APPROVED" | "ENGINEER_REJECTED" | "PROCUREMENT_APPROVED" | "PROCUREMENT_REJECTED" | "FINANCE_APPROVED" | "FINANCE_REJECTED" | "COMPLETED" | "CANCELLED";
export declare const RequestStatuses: RequestStatus[];
declare global {
    namespace Express {
        interface Request {
            userPermissions?: string[];
        }
    }
}
/**
 * RBAC Middleware Factory
 * Creates middleware to check specific permissions
 */
export declare const requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * RBAC Middleware for role-based access
 */
export declare const requireRole: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Get all permissions for a role (Admin use only)
 */
export declare const getRolePermissions: (roleName: string) => Promise<string[]>;
/**
 * Check if user can perform specific action on request
 * Used for workflow approval checks
 */
export declare const canApproveRequest: (userId: string, currentStatus: string) => Promise<{
    can: boolean;
    permission: string;
}>;
declare const _default: {
    requirePermission: (permission: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    requireRole: (...allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getRolePermissions: (roleName: string) => Promise<string[]>;
    canApproveRequest: (userId: string, currentStatus: string) => Promise<{
        can: boolean;
        permission: string;
    }>;
};
export default _default;
//# sourceMappingURL=rbac.d.ts.map