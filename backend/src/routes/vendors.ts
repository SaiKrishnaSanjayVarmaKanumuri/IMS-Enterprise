import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();
const prisma = new PrismaClient();

const auth = authenticate;

// ─── List Vendors ────────────────────────────────────────────────────
router.get("/", authenticate, async (req: Request, res: Response) => {
    try {
        const { search, isActive, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: Record<string, unknown> = {};
        if (isActive !== undefined) where.isActive = isActive === "true";
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { code: { contains: String(search), mode: "insensitive" } },
                { contactPerson: { contains: String(search), mode: "insensitive" } },
                { email: { contains: String(search), mode: "insensitive" } },
            ];
        }

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { name: "asc" },
            }),
            prisma.vendor.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                vendors,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch vendors" });
    }
});

// ─── Get Single Vendor ───────────────────────────────────────────────
router.get("/:id", authenticate, async (req: Request, res: Response) => {
    try {
        const vendor = await prisma.vendor.findUnique({
            where: { id: req.params.id },
            include: {
                purchaseOrders: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    select: {
                        id: true,
                        poNumber: true,
                        status: true,
                        totalAmount: true,
                        orderDate: true,
                    },
                },
            },
        });
        if (!vendor) return res.status(404).json({ success: false, error: "Vendor not found" });
        res.json({ success: true, data: { vendor } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch vendor" });
    }
});

// ─── Create Vendor ───────────────────────────────────────────────────
router.post("/", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const { name, email, phone, contactPerson, address, city, state, country, pincode, gstNumber, panNumber, paymentTerms, creditLimit, notes } = req.body;

        if (!name) return res.status(400).json({ success: false, error: "Vendor name is required" });

        // Generate code from name
        const code = name.toUpperCase().replace(/\s+/g, "-").substring(0, 10) + "-" + Date.now().toString().slice(-4);

        const vendor = await prisma.vendor.create({
            data: { name, code, email, phone, contactPerson, address, city, state, country, pincode, gstNumber, panNumber, paymentTerms: paymentTerms || 30, creditLimit, notes },
        });

        res.status(201).json({ success: true, data: { vendor }, message: "Vendor created successfully" });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to create vendor";
        res.status(500).json({ success: false, error: msg });
    }
});

// ─── Update Vendor ───────────────────────────────────────────────────
router.patch("/:id", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const vendor = await prisma.vendor.update({
            where: { id: req.params.id },
            data: req.body,
        });
        res.json({ success: true, data: { vendor }, message: "Vendor updated" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to update vendor" });
    }
});

// ─── Delete/Deactivate Vendor ────────────────────────────────────────
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        await prisma.vendor.update({ where: { id: req.params.id }, data: { isActive: false } });
        res.json({ success: true, message: "Vendor deactivated" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to deactivate vendor" });
    }
});

export default router;
