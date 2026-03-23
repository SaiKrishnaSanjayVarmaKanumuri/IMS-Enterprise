"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const auth = auth_js_1.authenticate;
// ─── Get My Notifications ─────────────────────────────────────────────
router.get("/", auth_js_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { isRead, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = { userId: user.userId };
        if (isRead !== undefined)
            where.isRead = isRead === "true";
        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId: user.userId, isRead: false } }),
        ]);
        res.json({
            success: true,
            data: {
                notifications,
                unreadCount,
                pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch notifications" });
    }
});
// ─── Mark Notification as Read ────────────────────────────────────────
router.patch("/:id/read", auth_js_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        await prisma.notification.updateMany({
            where: { id: req.params.id, userId: user.userId },
            data: { isRead: true },
        });
        res.json({ success: true, message: "Notification marked as read" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to update notification" });
    }
});
// ─── Mark All as Read ────────────────────────────────────────────────
router.patch("/mark-all-read", auth_js_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        await prisma.notification.updateMany({
            where: { userId: user.userId, isRead: false },
            data: { isRead: true },
        });
        res.json({ success: true, message: "All notifications marked as read" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to update notifications" });
    }
});
// ─── Delete Notification ─────────────────────────────────────────────
router.delete("/:id", auth_js_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        await prisma.notification.deleteMany({
            where: { id: req.params.id, userId: user.userId },
        });
        res.json({ success: true, message: "Notification deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to delete notification" });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map