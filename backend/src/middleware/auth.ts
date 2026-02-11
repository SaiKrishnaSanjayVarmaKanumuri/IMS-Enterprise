import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { logger, logAudit } from "../utils/logger.js";

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

// JWT Payload type
interface JwtPayload {
    id: string;
    email: string;
    role: string;
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        logAudit(
            null,
            "auth.missing_token",
            "auth",
            undefined,
            { ip: req.ip },
            "failed",
        );
        res.status(401).json({
            success: false,
            error: "Authentication required",
            code: "MISSING_TOKEN",
        });
        return;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        logAudit(
            null,
            "auth.invalid_token_format",
            "auth",
            undefined,
            { ip: req.ip },
            "failed",
        );
        res.status(401).json({
            success: false,
            error: "Invalid token format",
            code: "INVALID_TOKEN_FORMAT",
        });
        return;
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

        // Attach user to request
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            logAudit(
                null,
                "auth.token_expired",
                "auth",
                undefined,
                { ip: req.ip },
                "failed",
            );
            res.status(401).json({
                success: false,
                error: "Token expired",
                code: "TOKEN_EXPIRED",
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            logAudit(
                null,
                "auth.invalid_token",
                "auth",
                undefined,
                { ip: req.ip },
                "failed",
            );
            res.status(401).json({
                success: false,
                error: "Invalid token",
                code: "INVALID_TOKEN",
            });
            return;
        }

        logger.error("JWT verification error:", error);
        res.status(500).json({
            success: false,
            error: "Authentication failed",
            code: "AUTH_ERROR",
        });
    }
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user: {
    id: string;
    email: string;
    role: string;
}): string => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        config.jwt.secret,
        {
            expiresIn: config.jwt.expiresIn,
        } as jwt.SignOptions,
    );
};

/**
 * Verify JWT token without middleware
 */
export const verifyToken = (token: string): JwtPayload | null => {
    try {
        return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch {
        return null;
    }
};
