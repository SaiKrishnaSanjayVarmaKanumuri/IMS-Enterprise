"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const auth = auth_js_1.authenticate;
// ─── Generate PO Number ──────────────────────────────────────────────
async function generatePONumber() {
    const count = await prisma.purchaseOrder.count();
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
}
// ─── List Purchase Orders ─────────────────────────────────────────────
router.get("/", auth_js_1.authenticate, async (req, res) => {
    try {
        const { status, vendorId, siteId, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (status)
            where.status = String(status);
        if (vendorId)
            where.vendorId = String(vendorId);
        if (siteId)
            where.siteId = String(siteId);
        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    vendor: { select: { id: true, name: true, code: true } },
                    site: { select: { id: true, name: true, code: true } },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { items: true } },
                },
            }),
            prisma.purchaseOrder.count({ where }),
        ]);
        res.json({
            success: true,
            data: {
                purchaseOrders: orders,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit)),
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch purchase orders" });
    }
});
// ─── Get Single PO ───────────────────────────────────────────────────
router.get("/:id", auth_js_1.authenticate, async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: {
                vendor: true,
                site: { select: { id: true, name: true, code: true, address: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
                items: { include: { product: { include: { unit: true } } } },
                grnItems: true,
            },
        });
        if (!po)
            return res.status(404).json({ success: false, error: "Purchase order not found" });
        res.json({ success: true, data: { purchaseOrder: po } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch purchase order" });
    }
});
// ─── Create Purchase Order ────────────────────────────────────────────
router.post("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        const { vendorId, siteId, items, expectedDate, terms, notes, internalNotes } = req.body;
        if (!vendorId || !siteId || !items?.length) {
            return res.status(400).json({ success: false, error: "Vendor, site, and at least one item are required" });
        }
        const poNumber = await generatePONumber();
        // Compute totals
        let subtotal = 0;
        let taxAmount = 0;
        const processedItems = items.map((item) => {
            const lineTotal = item.quantity * item.unitPrice;
            const lineTax = lineTotal * ((item.taxRate || 0) / 100);
            subtotal += lineTotal;
            taxAmount += lineTax;
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate || 0,
                totalPrice: lineTotal + lineTax,
                description: item.description,
                notes: item.notes,
            };
        });
        const po = await prisma.purchaseOrder.create({
            data: {
                poNumber,
                vendorId,
                siteId,
                createdById: user.userId,
                expectedDate: expectedDate ? new Date(expectedDate) : undefined,
                subtotal,
                taxAmount,
                totalAmount: subtotal + taxAmount,
                terms,
                notes,
                internalNotes,
                items: { create: processedItems },
            },
            include: {
                vendor: { select: { name: true } },
                site: { select: { name: true } },
                items: { include: { product: true } },
            },
        });
        res.status(201).json({ success: true, data: { purchaseOrder: po }, message: "Purchase order created" });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to create purchase order";
        res.status(500).json({ success: false, error: msg });
    }
});
// ─── Confirm Purchase Order ───────────────────────────────────────────
router.patch("/:id/confirm", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
        if (!po)
            return res.status(404).json({ success: false, error: "PO not found" });
        if (po.status !== "DRAFT")
            return res.status(400).json({ success: false, error: "Only DRAFT POs can be confirmed" });
        const updated = await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: "CONFIRMED" },
        });
        res.json({ success: true, data: { purchaseOrder: updated }, message: "PO confirmed" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to confirm PO" });
    }
});
// ─── Receive Goods (GRN) ─────────────────────────────────────────────
router.post("/:id/receive", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const user = req.user;
        const { items } = req.body; // [{purchaseOrderItemId, receivedQuantity, batchNumber, notes}]
        if (!items?.length)
            return res.status(400).json({ success: false, error: "Items are required" });
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: { items: { include: { product: true } }, site: true },
        });
        if (!po)
            return res.status(404).json({ success: false, error: "PO not found" });
        if (!["CONFIRMED", "PARTIALLY_RECEIVED"].includes(po.status)) {
            return res.status(400).json({ success: false, error: "PO must be CONFIRMED to receive goods" });
        }
        // Process each received item
        const grnCreations = [];
        const stockUpdates = [];
        for (const receivedItem of items) {
            const poItem = po.items.find(i => i.id === receivedItem.purchaseOrderItemId);
            if (!poItem)
                continue;
            // Create GRN record
            grnCreations.push(prisma.gRNItem.create({
                data: {
                    purchaseOrderId: po.id,
                    purchaseOrderItemId: receivedItem.purchaseOrderItemId,
                    receivedQuantity: receivedItem.receivedQuantity,
                    batchNumber: receivedItem.batchNumber,
                    notes: receivedItem.notes,
                },
            }));
            // Update received quantity on PO item
            stockUpdates.push(prisma.purchaseOrderItem.update({
                where: { id: receivedItem.purchaseOrderItemId },
                data: { receivedQuantity: { increment: receivedItem.receivedQuantity } },
            }));
            // Find or create inventory item and add stock
            const inventoryItem = await prisma.inventoryItem.findFirst({
                where: { siteId: po.siteId, productId: poItem.productId },
            });
            if (inventoryItem) {
                const newStock = inventoryItem.currentStock + receivedItem.receivedQuantity;
                stockUpdates.push(prisma.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { currentStock: newStock, costPrice: poItem.unitPrice },
                }), prisma.stockMovement.create({
                    data: {
                        type: "ADD",
                        quantity: receivedItem.receivedQuantity,
                        previousStock: inventoryItem.currentStock,
                        newStock,
                        unitCost: poItem.unitPrice,
                        inventoryItemId: inventoryItem.id,
                        performedById: user.userId,
                        siteId: po.siteId,
                        reason: "Goods Receipt",
                        reference: po.poNumber,
                        batchNumber: receivedItem.batchNumber,
                        notes: receivedItem.notes,
                    },
                }));
            }
        }
        await Promise.all([...grnCreations, ...stockUpdates]);
        // Update PO status
        const updatedPO = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: { items: true },
        });
        const allReceived = updatedPO.items.every(i => i.receivedQuantity >= i.quantity);
        const anyReceived = updatedPO.items.some(i => i.receivedQuantity > 0);
        const newStatus = allReceived ? "RECEIVED" : anyReceived ? "PARTIALLY_RECEIVED" : "CONFIRMED";
        await prisma.purchaseOrder.update({
            where: { id: req.params.id },
            data: { status: newStatus, receivedDate: allReceived ? new Date() : undefined },
        });
        res.json({ success: true, message: "Goods received and stock updated successfully" });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to receive goods";
        res.status(500).json({ success: false, error: msg });
    }
});
// ─── Cancel PO ───────────────────────────────────────────────────────
router.patch("/:id/cancel", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
        if (!po)
            return res.status(404).json({ success: false, error: "PO not found" });
        if (["RECEIVED", "CLOSED"].includes(po.status)) {
            return res.status(400).json({ success: false, error: "Cannot cancel a received or closed PO" });
        }
        await prisma.purchaseOrder.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
        res.json({ success: true, message: "PO cancelled" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to cancel PO" });
    }
});
exports.default = router;
//# sourceMappingURL=purchaseOrders.js.map