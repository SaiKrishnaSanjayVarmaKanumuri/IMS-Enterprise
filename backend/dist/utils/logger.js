"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = exports.auditLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const index_js_1 = require("../config/index.js");
const { combine, timestamp, printf, colorize, errors } = winston_1.default.format;
// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    if (stack) {
        msg += `\n${stack}`;
    }
    return msg;
});
// Create logger instance
exports.logger = winston_1.default.createLogger({
    level: index_js_1.config.nodeEnv === "development" ? "debug" : "info",
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), logFormat),
    defaultMeta: { service: "ims-api" },
    transports: [
        // Console transport
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
        }),
    ],
});
// Audit logger for security-sensitive actions
exports.auditLogger = winston_1.default.createLogger({
    level: "info",
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.json()),
    defaultMeta: { service: "ims-audit" },
    transports: [
        new winston_1.default.transports.Console({
            format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.json()),
        }),
    ],
});
// Helper function for audit logging
const logAudit = (userId, action, resource, resourceId, details, status = "success", errorMessage) => {
    exports.auditLogger.info("AUDIT_LOG", {
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
exports.logAudit = logAudit;
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map