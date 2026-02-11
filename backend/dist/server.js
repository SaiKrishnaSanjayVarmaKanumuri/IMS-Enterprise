"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("./app.js"));
const index_js_1 = require("./config/index.js");
const logger_js_1 = require("./utils/logger.js");
const PORT = index_js_1.config.port;
const HOST = "0.0.0.0";
// Start server
app_js_1.default.listen(PORT, HOST, () => {
    logger_js_1.logger.info(`🚀 IMS Backend Server running at http://${HOST}:${PORT}`);
    logger_js_1.logger.info(`📍 Environment: ${index_js_1.config.nodeEnv}`);
    logger_js_1.logger.info(`🔗 API Base: http://${HOST}:${PORT}/api`);
    logger_js_1.logger.info(`💚 Health Check: http://${HOST}:${PORT}/health`);
});
// Graceful shutdown
const shutdown = (signal) => {
    logger_js_1.logger.info(`\n${signal} received. Shutting down gracefully...`);
    process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
exports.default = app_js_1.default;
//# sourceMappingURL=server.js.map