import winston from "winston";
import { config } from "../config/index.js";

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(
    ({ level, message, timestamp, stack, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        if (stack) {
            msg += `\n${stack}`;
        }
        return msg;
    },
);

// Create logger instance
export const logger = winston.createLogger({
    level: config.nodeEnv === "development" ? "debug" : "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        errors({ stack: true }),
        logFormat,
    ),
    defaultMeta: { service: "ims-api" },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                logFormat,
            ),
        }),
    ],
});

// Audit logger for security-sensitive actions
export const auditLogger = winston.createLogger({
    level: "info",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.json(),
    ),
    defaultMeta: { service: "ims-audit" },
    transports: [
        new winston.transports.Console({
            format: combine(
                timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                winston.format.json(),
            ),
        }),
    ],
});

// Helper function for audit logging
export const logAudit = (
    userId: string | null,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, unknown>,
    status: "success" | "failed" = "success",
    errorMessage?: string,
) => {
    auditLogger.info("AUDIT_LOG", {
        userId,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        status,
        errorMessage,
        timestamp: new Date().toISOString(),
    });
};

export default logger;
