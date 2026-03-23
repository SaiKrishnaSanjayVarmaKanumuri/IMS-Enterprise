"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_js_1 = require("../middleware/auth.js");
const rbac_js_1 = require("../middleware/rbac.js");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const auth = auth_js_1.authenticate;
// ─── List Products ───────────────────────────────────────────────────
router.get("/", auth_js_1.authenticate, async (req, res) => {
    try {
        const { search, categoryId, isActive, page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {};
        if (isActive !== undefined)
            where.isActive = isActive === "true";
        if (categoryId)
            where.categoryId = String(categoryId);
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch products" });
    }
});
// ─── Get Single Product ──────────────────────────────────────────────
router.get("/:id", auth_js_1.authenticate, async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { category: true, unit: true },
        });
        if (!product)
            return res.status(404).json({ success: false, error: "Product not found" });
        res.json({ success: true, data: { product } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch product" });
    }
});
// ─── Create Product ──────────────────────────────────────────────────
router.post("/", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
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
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to create product";
        res.status(500).json({ success: false, error: msg });
    }
});
// ─── Update Product ──────────────────────────────────────────────────
router.patch("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: req.body,
            include: { category: true, unit: true },
        });
        res.json({ success: true, data: { product } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to update product" });
    }
});
// ─── Delete Product ──────────────────────────────────────────────────
router.delete("/:id", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
        res.json({ success: true, message: "Product deactivated" });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to deactivate product" });
    }
});
// ─── List Categories ─────────────────────────────────────────────────
router.get("/categories/list", auth_js_1.authenticate, async (_req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: "asc" },
            include: { children: true },
        });
        res.json({ success: true, data: { categories } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch categories" });
    }
});
// ─── Create Category ─────────────────────────────────────────────────
router.post("/categories", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { name, code, description, parentId } = req.body;
        const category = await prisma.category.create({ data: { name, code, description, parentId } });
        res.status(201).json({ success: true, data: { category } });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to create category";
        res.status(500).json({ success: false, error: msg });
    }
});
// ─── List Units of Measure ───────────────────────────────────────────
router.get("/units/list", auth_js_1.authenticate, async (_req, res) => {
    try {
        const units = await prisma.unitOfMeasure.findMany({ orderBy: { name: "asc" } });
        res.json({ success: true, data: { units } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "Failed to fetch units" });
    }
});
// ─── Create Unit ─────────────────────────────────────────────────────
router.post("/units", auth_js_1.authenticate, (0, rbac_js_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { name, abbreviation, type } = req.body;
        const unit = await prisma.unitOfMeasure.create({ data: { name, abbreviation, type } });
        res.status(201).json({ success: true, data: { unit } });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to create unit";
        res.status(500).json({ success: false, error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map