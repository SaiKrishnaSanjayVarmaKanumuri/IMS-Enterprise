"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        (0, logger_js_1.logAudit)(null, "auth.missing_token", "auth", undefined, { ip: req.ip }, "failed");
        res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "MISSING_TOKEN",
        });
        return;
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        (0, logger_js_1.logAudit)(null, "auth.invalid_token_format", "auth", undefined, { ip: req.ip }, "failed");
        res.status(401).json({
            success: false,
            error: "Invalid token format",
            code: "INVALID_TOKEN_FORMAT",
        });
        return;
    }
    const token = parts[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
        // Attach user to request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            (0, logger_js_1.logAudit)(null, "auth.token_expired", "auth", undefined, { ip: req.ip }, "failed");
            res.status(401).json({
                success: false,
                error: "Token expired",
                code: "TOKEN_EXPIRED",
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            (0, logger_js_1.logAudit)(null, "auth.invalid_token", "auth", undefined, { ip: req.ip }, "failed");
            res.status(401).json({
                success: false,
                error: "Invalid token",
                code: "INVALID_TOKEN",
            });
            return;
        }
        logger_js_1.logger.error("JWT verification error:", error);
        res.status(500).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_ERROR",
        });
    }
};
exports.authenticate = authenticate;
/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        role: user.role,
    }, index_js_1.config.jwt.secret, {
        expiresIn: index_js_1.config.jwt.expiresIn,
    });
};
exports.generateToken = generateToken;
/**
 * Verify JWT token without middleware
 */
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.secret);
    }
    catch {
        return null;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map