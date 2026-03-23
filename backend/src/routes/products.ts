import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

const router = Router();
const prisma = new PrismaClient();

const auth = authenticate;

// ─── List Products ───────────────────────────────────────────────────
router.get("/", authenticate, async (req: Request, res: Response) => {
    try {
        const { search, categoryId, isActive, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: Record<string, unknown> = {};
        if (isActive !== undefined) where.isActive = isActive === "true";
        if (categoryId) where.categoryId = String(categoryId);
        if (search) {
            where.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { sku: { contains: String(search), mode: "insensitive" } },
                { description: { contains: String(search), mode: "insensitive" } },
            ];
        }

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { name: "asc" },
                include: { category: true, unit: true },
            }),
            prisma.product.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch products" });
    }
});

// ─── Get Single Product ──────────────────────────────────────────────
router.get("/:id", authenticate, async (req: Request, res: Response) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { category: true, unit: true },
        });
        if (!product) return res.status(404).json({ success: false, error: "Product not found" });
        res.json({ success: true, data: { product } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch product" });
    }
});

// ─── Create Product ──────────────────────────────────────────────────
router.post("/", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const { name, sku, description, specifications, categoryId, unitId, costPrice, sellingPrice, taxRate, hsnCode, barcodeValue } = req.body;

        if (!name || !sku || !categoryId || !unitId) {
            return res.status(400).json({ success: false, error: "Name, SKU, category, and unit are required" });
        }

        const product = await prisma.product.create({
            data: { name, sku, description, specifications, categoryId, unitId, costPrice: costPrice || 0, sellingPrice, taxRate: taxRate || 0, hsnCode, barcodeValue },
            include: { category: true, unit: true },
        });

        res.status(201).json({ success: true, data: { product }, message: "Product created" });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to create product";
        res.status(500).json({ success: false, error: msg });
    }
});

// ─── Update Product ──────────────────────────────────────────────────
router.patch("/:id", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: req.body,
            include: { category: true, unit: true },
        });
        res.json({ success: true, data: { product } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to update product" });
    }
});

// ─── Delete Product ──────────────────────────────────────────────────
router.delete("/:id", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
        res.json({ success: true, message: "Product deactivated" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to deactivate product" });
    }
});

// ─── List Categories ─────────────────────────────────────────────────
router.get("/categories/list", authenticate, async (_req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
            include: { children: true },
        });
        res.json({ success: true, data: { categories } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch categories" });
    }
});

// ─── Create Category ─────────────────────────────────────────────────
router.post("/categories", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const { name, code, description, parentId } = req.body;
        const category = await prisma.category.create({ data: { name, code, description, parentId } });
        res.status(201).json({ success: true, data: { category } });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to create category";
        res.status(500).json({ success: false, error: msg });
    }
});

// ─── List Units of Measure ───────────────────────────────────────────
router.get("/units/list", authenticate, async (_req: Request, res: Response) => {
    try {
        const units = await prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } });
        res.json({ success: true, data: { units } });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch units" });
    }
});

// ─── Create Unit ─────────────────────────────────────────────────────
router.post("/units", authenticate, requireRole("ADMIN"), async (req: Request, res: Response) => {
    try {
        const { name, abbreviation, type } = req.body;
        const unit = await prisma.unitOfMeasure.create({ data: { name, abbreviation, type } });
        res.status(201).json({ success: true, data: { unit } });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to create unit";
        res.status(500).json({ success: false, error: msg });
    }
});

export default router;
