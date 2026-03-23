import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import PDFDocument from "pdfkit";
import { createObjectCsvStringifier } from "csv-writer";

const router = Router();
const prisma = new PrismaClient();

const auth = authenticate;

// ─── Export Stock Valuation CSV ───────────────────────────────────────
router.get("/inventory/csv", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId } = req.query;
        const where = siteId ? { siteId: String(siteId) } : {};

        const items = await prisma.inventoryItem.findMany({
            where,
            include: { site: { select: { name: true, code: true } } },
            orderBy: { name: "asc" },
        });

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: "code", title: "Item Code" },
                { id: "name", title: "Item Name" },
                { id: "category", title: "Category" },
                { id: "unit", title: "Unit" },
                { id: "currentStock", title: "Current Stock" },
                { id: "minimumStock", title: "Min Stock" },
                { id: "costPrice", title: "Unit Cost (₹)" },
                { id: "totalValue", title: "Total Value (₹)" },
                { id: "location", title: "Location" },
                { id: "site", title: "Site" },
                { id: "status", title: "Status" },
            ],
        });

        const records = items.map(i => ({
            code: i.code,
            name: i.name,
            category: i.category,
            unit: i.unit,
            currentStock: i.currentStock,
            minimumStock: i.minimumStock,
            costPrice: i.costPrice.toFixed(2),
            totalValue: (i.currentStock * i.costPrice).toFixed(2),
            location: i.location || "",
            site: `${i.site.name} (${i.site.code})`,
            status: i.currentStock <= 0 ? "Out of Stock" : i.currentStock <= i.minimumStock ? "Low Stock" : "In Stock",
        }));

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="inventory-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to generate CSV" });
    }
});

// ─── Export Purchase Orders CSV ───────────────────────────────────────
router.get("/purchase-orders/csv", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId, status } = req.query;
        const where: Record<string, unknown> = {};
        if (siteId) where.siteId = String(siteId);
        if (status) where.status = String(status);

        const orders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                vendor: { select: { name: true } },
                site: { select: { name: true, code: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: "poNumber", title: "PO Number" },
                { id: "vendor", title: "Vendor" },
                { id: "site", title: "Site" },
                { id: "status", title: "Status" },
                { id: "orderDate", title: "Order Date" },
                { id: "expectedDate", title: "Expected Date" },
                { id: "totalAmount", title: "Total Amount (₹)" },
                { id: "createdBy", title: "Created By" },
            ],
        });

        const records = orders.map(o => ({
            poNumber: o.poNumber,
            vendor: o.vendor.name,
            site: `${o.site.name} (${o.site.code})`,
            status: o.status,
            orderDate: o.orderDate.toLocaleDateString(),
            expectedDate: o.expectedDate?.toLocaleDateString() || "",
            totalAmount: o.totalAmount.toFixed(2),
            createdBy: `${o.createdBy.firstName} ${o.createdBy.lastName}`,
        }));

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="purchase-orders-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to generate CSV" });
    }
});

// ─── Generate Purchase Order PDF ─────────────────────────────────────
router.get("/purchase-orders/:id/pdf", authenticate, async (req: Request, res: Response) => {
    try {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id: req.params.id },
            include: {
                vendor: true,
                site: true,
                createdBy: { select: { firstName: true, lastName: true, email: true } },
                items: { include: { product: { include: { unit: true } } } },
            },
        });

        if (!po) return res.status(404).json({ success: false, error: "PO not found" });

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="PO-${po.poNumber}.pdf"`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text("PURCHASE ORDER", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(12).font("Helvetica").text(`PO Number: ${po.poNumber}`, { align: "right" });
        doc.text(`Date: ${po.orderDate.toLocaleDateString()}`, { align: "right" });
        doc.text(`Status: ${po.status}`, { align: "right" });
        doc.moveDown();

        // Vendor & Site Info
        doc.font("Helvetica-Bold").text("Vendor:");
        doc.font("Helvetica").text(po.vendor.name);
        if (po.vendor.address) doc.text(po.vendor.address);
        if (po.vendor.gstNumber) doc.text(`GST: ${po.vendor.gstNumber}`);
        doc.moveDown();

        doc.font("Helvetica-Bold").text("Delivery Site:");
        doc.font("Helvetica").text(`${po.site.name} (${po.site.code})`);
        doc.text(po.site.address);
        doc.moveDown();

        // Items Table Header
        const tableTop = doc.y;
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("#", 50, tableTop);
        doc.text("Item", 70, tableTop);
        doc.text("Qty", 280, tableTop);
        doc.text("Unit", 330, tableTop);
        doc.text("Unit Price", 380, tableTop);
        doc.text("Tax%", 450, tableTop);
        doc.text("Total", 500, tableTop);

        doc.moveTo(50, doc.y + 5).lineTo(560, doc.y + 5).stroke();
        doc.moveDown(0.3);

        doc.font("Helvetica").fontSize(9);
        po.items.forEach((item, idx) => {
            const y = doc.y;
            doc.text(String(idx + 1), 50, y);
            doc.text(item.product.name.substring(0, 35), 70, y);
            doc.text(String(item.quantity), 280, y);
            doc.text(item.product.unit.abbreviation, 330, y);
            doc.text(`₹${item.unitPrice.toFixed(2)}`, 380, y);
            doc.text(`${item.taxRate}%`, 450, y);
            doc.text(`₹${item.totalPrice.toFixed(2)}`, 500, y);
            doc.moveDown(0.5);
        });

        doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke();
        doc.moveDown(0.3);

        // Totals
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text(`Subtotal: ₹${po.subtotal.toFixed(2)}`, { align: "right" });
        doc.text(`Tax: ₹${po.taxAmount.toFixed(2)}`, { align: "right" });
        doc.fontSize(12).text(`Total: ₹${po.totalAmount.toFixed(2)}`, { align: "right" });

        if (po.terms) {
            doc.moveDown();
            doc.font("Helvetica-Bold").fontSize(10).text("Terms & Conditions:");
            doc.font("Helvetica").fontSize(9).text(po.terms);
        }

        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to generate PDF" });
    }
});

// ─── Export Requests CSV ─────────────────────────────────────────────
router.get("/requests/csv", authenticate, async (req: Request, res: Response) => {
    try {
        const { siteId, status } = req.query;
        const where: Record<string, unknown> = {};
        if (siteId) where.siteId = String(siteId);
        if (status) where.status = String(status);

        const requests = await prisma.request.findMany({
            where,
            include: {
                site: { select: { name: true, code: true } },
                requester: { select: { firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: "requestNumber", title: "Request #" },
                { id: "type", title: "Type" },
                { id: "status", title: "Status" },
                { id: "priority", title: "Priority" },
                { id: "site", title: "Site" },
                { id: "requester", title: "Requester" },
                { id: "description", title: "Description" },
                { id: "estimatedCost", title: "Estimated Cost (₹)" },
                { id: "actualCost", title: "Actual Cost (₹)" },
                { id: "createdAt", title: "Created At" },
            ],
        });

        const records = requests.map(r => ({
            requestNumber: r.requestNumber,
            type: r.type,
            status: r.status,
            priority: r.priority,
            site: `${r.site.name} (${r.site.code})`,
            requester: `${r.requester.firstName} ${r.requester.lastName}`,
            description: r.description,
            estimatedCost: r.estimatedCost?.toFixed(2) || "",
            actualCost: r.actualCost?.toFixed(2) || "",
            createdAt: r.createdAt.toLocaleDateString(),
        }));

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="requests-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to generate CSV" });
    }
});

// ─── Export Audit Logs CSV ───────────────────────────────────────────
router.get("/audit-logs/csv", authenticate, async (req: Request, res: Response) => {
    try {
        const logs = await prisma.auditLog.findMany({
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
            orderBy: { createdAt: "desc" },
            take: 5000,
        });

        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: "user", title: "User" },
                { id: "action", title: "Action" },
                { id: "resource", title: "Resource" },
                { id: "status", title: "Status" },
                { id: "ipAddress", title: "IP Address" },
                { id: "createdAt", title: "Timestamp" },
            ],
        });

        const records = logs.map(l => ({
            user: l.user ? `${l.user.firstName} ${l.user.lastName} (${l.user.email})` : "System",
            action: l.action,
            resource: l.resource,
            status: l.status,
            ipAddress: l.ipAddress || "",
            createdAt: l.createdAt.toLocaleString(),
        }));

        const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="audit-logs-${Date.now()}.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to generate CSV" });
    }
});

export default router;
