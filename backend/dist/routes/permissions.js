"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
const logger_js_1 = require("../utils/logger.js");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * GET /permissions
 * Get all permissions (Admin only)
 */
router.get("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
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
    }
    catch (error) {
        logger_js_1.logger.error("Get permissions error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch permissions",
            code: "FETCH_PERMISSIONS_ERROR",
        });
    }
});
exports.default = router;
//# sourceMappingURL=permissions.js.map