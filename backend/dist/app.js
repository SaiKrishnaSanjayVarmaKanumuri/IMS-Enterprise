"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("./config/index.js");
const logger_js_1 = require("./utils/logger.js");
// Import routes
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const users_js_1 = __importDefault(require("./routes/users.js"));
const roles_js_1 = __importDefault(require("./routes/roles.js"));
const sites_js_1 = __importDefault(require("./routes/sites.js"));
const requests_js_1 = __importDefault(require("./routes/requests.js"));
const inventory_js_1 = __importDefault(require("./routes/inventory.js"));
// Create Express app
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
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
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "IMS API is running",
        timestamp: new Date().toISOString(),
        environment: index_js_1.config.nodeEnv,
    });
});
// API Routes
app.use("/api/auth", auth_js_1.default);
app.use("/api/users", users_js_1.default);
app.use("/api/roles", roles_js_1.default);
app.use("/api/sites", sites_js_1.default);
app.use("/api/requests", requests_js_1.default);
app.use("/api/inventory", inventory_js_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Endpoint not found",
        code: "NOT_FOUND",
    });
});
// Global error handler
app.use((err, req, res, next) => {
    logger_js_1.logger.error("Unhandled error:", err);
    res.status(500).json({
        success: false,
        error: index_js_1.config.nodeEnv === "production"
            ? "Internal server error"
            : err.message,
        code: "INTERNAL_ERROR",
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map