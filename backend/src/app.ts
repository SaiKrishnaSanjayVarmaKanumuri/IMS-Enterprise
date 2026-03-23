import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import path from "path";


// ─── Core Routes ──────────────────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import roleRoutes from "./routes/roles.js";
import permissionsRoutes from "./routes/permissions.js";
import siteRoutes from "./routes/sites.js";
import requestRoutes from "./routes/requests.js";
import inventoryRoutes from "./routes/inventory.js";

// ─── Enterprise Routes ────────────────────────────────────────────────
import vendorRoutes from "./routes/vendors.js";
import productRoutes from "./routes/products.js";
import purchaseOrderRoutes from "./routes/purchaseOrders.js";
import analyticsRoutes from "./routes/analytics.js";
import notificationRoutes from "./routes/notifications.js";
import reportRoutes from "./routes/reports.js";

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    }),
);

// Rate limiting
const limiter = rateLimit({
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// ─── Health Check ─────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    let dbStatus = "ok";
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        dbStatus = "error";
    } finally {
        await prisma.$disconnect();
    }

    res.json({
        success: true,
        message: "IMS API is running",
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        version: "2.0.0",
        database: dbStatus,
    });
});

// ─── Core API Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/sites", siteRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/inventory", inventoryRoutes);

// ─── Enterprise API Routes ────────────────────────────────────────────
app.use("/api/vendors", vendorRoutes);
app.use("/api/products", productRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

// ─── Serve Frontend in Production ───────────────────────────────────────
if (config.nodeEnv === "production") {
    const frontendDist = path.join(__dirname, "../../frontend/dist");
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
        res.sendFile(path.join(frontendDist, "index.html"));
    });
} else {
    // ─── Error Handling (API Only) ────────────────────────────────────────
    app.use(notFoundHandler);
}

app.use(errorHandler);

export default app;
