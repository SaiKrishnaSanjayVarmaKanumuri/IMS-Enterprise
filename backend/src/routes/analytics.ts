import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

const auth = authenticate;

// Helper: Get date N days ago
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

// ─── Dashboard KPIs ──────────────────────────────────────────────────
router.get("/kpis", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        const siteFilter = siteId ? { siteId: String(siteId) } : {};

        const [
            totalInventoryItems,
            lowStockCount,
            pendingRequests,
            pendingPOs,
            totalVendors,
            recentMovements,
            totalSites,
            activeSites,
        ] = await Promise.all([
            prisma.inventoryItem.count({ where: siteFilter }),
            prisma.inventoryItem.count({
                where: {
                    ...siteFilter,
                    AND: [
                        { minimumStock: { gt: 0 } },
                        { currentStock: { lte: prisma.inventoryItem.fields.minimumStock } },
                    ],
                },
            }).catch(() =>
                // Fallback: manual low stock count
                prisma.inventoryItem.findMany({ where: siteFilter }).then(items =>
                    items.filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock).length
                )
            ),
            prisma.request.count({ where: { status: "PENDING", ...siteFilter } }),
            prisma.purchaseOrder.count({ where: { status: { in: ["CONFIRMED", "PARTIALLY_RECEIVED"] }, ...siteFilter } }),
            prisma.vendor.count({ where: { isActive: true } }),
            prisma.stockMovement.count({ where: { createdAt: { gte: daysAgo(30) }, ...siteFilter } }),
            prisma.site.count(),
            prisma.site.count({ where: { status: "active" } }),
        ]);

        // Inventory value
        const allItems = await prisma.inventoryItem.findMany({
            where: siteFilter,
            select: { currentStock: true, costPrice: true },
        });
        const totalInventoryValue = allItems.reduce((sum, item) => sum + item.currentStock * item.costPrice, 0);

        // Monthly spend (POs received in last 30 days)
        const recentPOs = await prisma.purchaseOrder.findMany({
            where: {
                status: { in: ["RECEIVED", "CLOSED"] },
                receivedDate: { gte: daysAgo(30) },
                ...siteFilter,
            },
            select: { totalAmount: true },
        });
        const monthlySpend = recentPOs.reduce((sum, po) => sum + po.totalAmount, 0);

        // Request fulfillment rate (last 30 days)
        const [completedRequests, totalRequests30] = await Promise.all([
            prisma.request.count({ where: { status: "COMPLETED", createdAt: { gte: daysAgo(30) }, ...siteFilter } }),
            prisma.request.count({ where: { createdAt: { gte: daysAgo(30) }, ...siteFilter } }),
        ]);

        res.json({
            success: true,
            data: {
                totalInventoryItems,
                lowStockCount,
                pendingRequests,
                pendingPOs,
                totalVendors,
                totalSites,
                activeSites,
                totalInventoryValue,
                monthlySpend,
                recentMovements,
                fulfillmentRate: totalRequests30 > 0 ? Math.round((completedRequests / totalRequests30) * 100) : 0,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch KPIs" });
    }
});

// ─── Stock Movement Trends (Chart Data) ──────────────────────────────
router.get("/stock-trends", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId, days = 30 } = req.query;
        const siteFilter = siteId ? { siteId: String(siteId) } : {};
        const startDate = daysAgo(Number(days));

        const movements = await prisma.stockMovement.findMany({
            where: { createdAt: { gte: startDate }, ...siteFilter },
            select: { createdAt: true, type: true, quantity: true },
            orderBy: { createdAt: "asc" },
        });

        // Group by date
        const byDate: Record<string, { date: string; added: number; consumed: number }> = {};
        movements.forEach(m => {
            const date = m.createdAt.toISOString().split("T")[0];
            if (!byDate[date]) byDate[date] = { date, added: 0, consumed: 0 };
            if (m.type === "ADD") byDate[date].added += m.quantity;
            else if (m.type === "CONSUME") byDate[date].consumed += m.quantity;
        });

        res.json({ success: true, data: { trends: Object.values(byDate) } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch stock trends" });
    }
});

// ─── Top Consumed Items ───────────────────────────────────────────────
router.get("/top-consumed", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId, days = 30, limit = 10 } = req.query;
        const siteFilter = siteId ? { siteId: String(siteId) } : {};
        const startDate = daysAgo(Number(days));

        const movements = await prisma.stockMovement.findMany({
            where: { type: "CONSUME", createdAt: { gte: startDate }, ...siteFilter },
            include: { inventoryItem: { select: { name: true, code: true, unit: true } } },
        });

        // Aggregate by item
        const byItem: Record<string, { itemName: string; itemCode: string; unit: string; totalConsumed: number }> = {};
        movements.forEach(m => {
            const key = m.inventoryItemId;
            if (!byItem[key]) {
                byItem[key] = {
                    itemName: m.inventoryItem.name,
                    itemCode: m.inventoryItem.code,
                    unit: m.inventoryItem.unit,
                    totalConsumed: 0,
                };
            }
            byItem[key].totalConsumed += m.quantity;
        });

        const sorted = Object.values(byItem)
            .sort((a, b) => b.totalConsumed - a.totalConsumed)
            .slice(0, Number(limit));

        res.json({ success: true, data: { items: sorted } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch top consumed items" });
    }
});

// ─── Request Status Distribution ────────────────────────────────────
router.get("/request-distribution", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        const siteFilter = siteId ? { siteId: String(siteId) } : {};

        const statuses = ["PENDING", "ENGINEER_APPROVED", "PROCUREMENT_APPROVED", "FINANCE_APPROVED", "COMPLETED", "REJECTED", "CANCELLED"];

        const counts = await Promise.all(
            statuses.map(async status => ({
                status,
                count: await prisma.request.count({ where: { status, ...siteFilter } }),
            }))
        );

        res.json({ success: true, data: { distribution: counts.filter(c => c.count > 0) } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch request distribution" });
    }
});

// ─── Low Stock Items ──────────────────────────────────────────────────
router.get("/low-stock", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        const siteFilter = siteId ? { siteId: String(siteId) } : {};

        const items = await prisma.inventoryItem.findMany({
            where: siteFilter,
            include: { site: { select: { name: true, code: true } } },
        });

        const lowStock = items
            .filter(i => i.minimumStock > 0 && i.currentStock <= i.minimumStock)
            .map(i => ({
                id: i.id,
                name: i.name,
                code: i.code,
                currentStock: i.currentStock,
                minimumStock: i.minimumStock,
                unit: i.unit,
                site: i.site,
                severity: i.currentStock === 0 ? "critical" : "warning",
            }))
            .sort((a, b) => a.currentStock - b.currentStock);

        res.json({ success: true, data: { items: lowStock } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch low stock items" });
    }
});

// ─── Inventory Valuation ─────────────────────────────────────────────
router.get("/inventory-valuation", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        const siteFilter = siteId ? { siteId: String(siteId) } : {};

        const items = await prisma.inventoryItem.findMany({
            where: siteFilter,
            include: { site: { select: { name: true, code: true } } },
        });

        const valuationData = items.map(i => ({
            id: i.id,
            name: i.name,
            code: i.code,
            category: i.category,
            currentStock: i.currentStock,
            unit: i.unit,
            costPrice: i.costPrice,
            totalValue: i.currentStock * i.costPrice,
            site: i.site,
        }));

        const totalValue = valuationData.reduce((sum, i) => sum + i.totalValue, 0);

        // By category
        const byCategory: Record<string, { category: string; totalValue: number; itemCount: number }> = {};
        valuationData.forEach(i => {
            if (!byCategory[i.category]) byCategory[i.category] = { category: i.category, totalValue: 0, itemCount: 0 };
            byCategory[i.category].totalValue += i.totalValue;
            byCategory[i.category].itemCount += 1;
        });

        res.json({
            success: true,
            data: {
                items: valuationData,
                totalValue,
                byCategory: Object.values(byCategory),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch inventory valuation" });
    }
});

// ─── Vendor Performance ───────────────────────────────────────────────
router.get("/vendor-performance", authenticate, async (req: Request, res: Response) => {
    try {
        const vendors = await prisma.vendor.findMany({
            where: { isActive: true },
            include: {
                purchaseOrders: {
                    select: { status: true, totalAmount: true, orderDate: true, receivedDate: true, expectedDate: true },
                },
            },
        });

        const performance = vendors.map(v => {
            const total = v.purchaseOrders.length;
            const completed = v.purchaseOrders.filter(po => po.status === "RECEIVED" || po.status === "CLOSED").length;
            const onTime = v.purchaseOrders.filter(po =>
                po.receivedDate && po.expectedDate && po.receivedDate <= po.expectedDate
            ).length;
            const totalSpend = v.purchaseOrders.reduce((s, po) => s + po.totalAmount, 0);

            return {
                id: v.id,
                name: v.name,
                code: v.code,
                totalOrders: total,
                completedOrders: completed,
                onTimeDeliveryRate: completed > 0 ? Math.round((onTime / completed) * 100) : 0,
                totalSpend,
                rating: v.rating,
            };
        }).filter(v => v.totalOrders > 0);

        res.json({ success: true, data: { vendors: performance } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch vendor performance" });
    }
});

export default router;
