import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { logger, logAudit } from "../utils/logger.js";
import { PrismaClient } from "@prisma/client";
import {
    login,
    me,
    changePassword,
    logout,
} from "../controllers/authController.js";

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
 * POST /auth/login
 * Login - Only Admin can create users, users login with credentials
 */
router.post(
    "/login",
    [
        body("email").isEmail().normalizeEmail(),
        body("password").isLength({ min: 1 }),
        handleValidation,
    ],
    login,
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get("/me", authenticate, me);

/**
 * POST /auth/change-password
 * Change password for authenticated user
 */
router.post(
    "/change-password",
    authenticate,
    [
        body("currentPassword").isLength({ min: 1 }),
        body("newPassword").isLength({ min: 8 }),
        handleValidation,
    ],
    changePassword,
);

/**
 * POST /auth/logout
 * Logout (client-side token removal)
 */
router.post("/logout", authenticate, logout);

export default router;
