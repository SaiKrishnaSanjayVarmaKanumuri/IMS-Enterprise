"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("./config/index.js");
const logger_js_1 = require("./utils/logger.js");
const errorMiddleware_js_1 = require("./middleware/errorMiddleware.js");
// ─── Core Routes ──────────────────────────────────────────────────────
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const roles_js_1 = __importDefault(require("./routes/roles.js"));
const permissions_js_1 = __importDefault(require("./routes/permissions.js"));
const sites_js_1 = __importDefault(require("./routes/sites.js"));
const requests_js_1 = __importDefault(require("./routes/requests.js"));
const inventory_js_1 = __importDefault(require("./routes/inventory.js"));
// ─── Enterprise Routes ────────────────────────────────────────────────
const vendors_js_1 = __importDefault(require("./routes/vendors.js"));
const products_js_1 = __importDefault(require("./routes/products.js"));
const purchaseOrders_js_1 = __importDefault(require("./routes/purchaseOrders.js"));
const analytics_js_1 = __importDefault(require("./routes/analytics.js"));
const notifications_js_1 = __importDefault(require("./routes/notifications.js"));
const reports_js_1 = __importDefault(require("./routes/reports.js"));
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        error: "Too many requests, please try again later",
        code: "RATE_LIMIT_EXCEEDED",
    },
});
app.use("/api/", limiter);
// Body parsing
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger_js_1.logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
});
// ─── Health Check ─────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    let dbStatus = "ok";
    try {
        await prisma.$queryRaw `SELECT 1`;
    }
    catch {
        dbStatus = "error";
    }
    finally {
        await prisma.$disconnect();
    }
    res.json({
        success: true,
        message: "IMS API is running",
        timestamp: new Date().toISOString(),
        environment: index_js_1.config.nodeEnv,
        version: "2.0.0",
        database: dbStatus,
    });
});
// ─── Core API Routes ──────────────────────────────────────────────────
app.use("/api/auth", auth_js_1.default);
app.use("/api/users", users_js_1.default);
app.use("/api/roles", roles_js_1.default);
app.use("/api/permissions", permissions_js_1.default);
app.use("/api/sites", sites_js_1.default);
app.use("/api/requests", requests_js_1.default);
app.use("/api/inventory", inventory_js_1.default);
// ─── Enterprise API Routes ────────────────────────────────────────────
app.use("/api/vendors", vendors_js_1.default);
app.use("/api/products", products_js_1.default);
app.use("/api/purchase-orders", purchaseOrders_js_1.default);
app.use("/api/analytics", analytics_js_1.default);
app.use("/api/notifications", notifications_js_1.default);
app.use("/api/reports", reports_js_1.default);
// ─── Error Handling ───────────────────────────────────────────────────
app.use(errorMiddleware_js_1.notFoundHandler);
app.use(errorMiddleware_js_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map