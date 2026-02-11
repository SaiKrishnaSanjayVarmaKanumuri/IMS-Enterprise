import app from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";

const PORT = 3000; // Hardcoded for consistent behavior
const HOST = "0.0.0.0";

// Start server
app.listen(PORT, HOST, () => {
    logger.info(`🚀 IMS Backend Server running at http://${HOST}:${PORT}`);
    logger.info(`📍 Environment: ${config.nodeEnv}`);
    logger.info(`🔗 API Base: http://${HOST}:${PORT}/api`);
    logger.info(`💚 Health Check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
