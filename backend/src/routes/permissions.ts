import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { logger } from "../utils/logger.js";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /permissions
 * Get all permissions (Admin only)
 */
router.get(
    "/",
    authenticate,
    requireRole("ADMIN"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const permissions = await prisma.permission.findMany({
                orderBy: [{ resource: "asc" }, { action: "asc" }],
            });

            res.json({
                success: true,
                data: {
                    permissions: permissions.map((p) => ({
                        id: p.id,
                        name: p.name,
                        resource: p.resource,
                        action: p.action,
                        description: p.description,
                    })),
                },
            });
        } catch (error) {
            logger.error("Get permissions error:", error);
            res.status(500).json({
                success: false,
                error: "Failed to fetch permissions",
                code: "FETCH_PERMISSIONS_ERROR",
            });
        }
    },
);

export default router;
