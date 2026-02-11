"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_js_1 = require("../middleware/auth.js");
const client_1 = require("@prisma/client");
const authController_js_1 = require("../controllers/authController.js");
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
 * POST /auth/login
 * Login - Only Admin can create users, users login with credentials
 */
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().normalizeEmail(),
    (0, express_validator_1.body)("password").isLength({ min: 1 }),
    handleValidation,
], authController_js_1.login);
/**
 * GET /auth/me
 * Get current user info
 */
router.get("/me", auth_js_1.authenticate, authController_js_1.me);
/**
 * POST /auth/change-password
 * Change password for authenticated user
 */
router.post("/change-password", auth_js_1.authenticate, [
    (0, express_validator_1.body)("currentPassword").isLength({ min: 1 }),
    (0, express_validator_1.body)("newPassword").isLength({ min: 8 }),
    handleValidation,
], authController_js_1.changePassword);
/**
 * POST /auth/logout
 * Logout (client-side token removal)
 */
router.post("/logout", auth_js_1.authenticate, authController_js_1.logout);
exports.default = router;
//# sourceMappingURL=auth.js.map