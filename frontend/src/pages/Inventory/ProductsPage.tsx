import { useEffect, useState } from "react";
import { Plus, Search, Package, CheckCircle, XCircle, Edit2 } from "lucide-react";
import { apiClient } from "../../services/api";

interface Product {
    id: string;
    name: string;
    code: string;
    sku: string | null;
    description: string | null;
    category: { id: string; name: string };
    unit: { id: string; name: string; abbreviation: string };
    costPrice: number;
    minimumStock: number;
    maximumStock: number | null;
    barcodeValue: string | null;
    isActive: boolean;
    isTracked: boolean;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [totalCount, setTotalCount] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await apiClient.products.list({ search: search || undefined, limit: 50 });
            const data = res.data.data as { products: Product[]; pagination: { total: number } };
            setProducts(data.products || []);
            setTotalCount(data.pagination?.total || 0);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(() => loadProducts(), 300);
        return () => clearTimeout(t);
    }, [search]);

    const handleSave = () => { loadProducts(); setModalOpen(false); };

    return (
        <div className="vendors-page">
            <div className="page-header">
                <div>
                    <h1>Product Catalog</h1>
                    <p>Manage global items, categories, and Reorder rules ({totalCount} total)</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn-primary" onClick={() => { setEditingProduct(null); setModalOpen(true); }}>
                        <Plus size={18} /> Add Product
                    </button>
                </div>
            </div>

            <div className="search-bar-form">
                <div className="search-input-wrap">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search products by name, code, or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="page-loading"><div className="spinning"><Package size={40} /></div></div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <Package className="empty-state-icon" />
                    <h3>No products found</h3>
                    <p>Get started by adding items to your global product catalog.</p>
                </div>
            ) : (
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Code / SKU</th>
                                <th>Category</th>
                                <th>Unit</th>
                                <th>Cost Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--ims-muted)" }}>{p.description || "—"}</div>
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
                                        {p.code} <br/>
                                        <span style={{color: "var(--ims-muted)"}}>{p.sku || ""}</span>
                                    </td>
                                    <td>{p.category.name}</td>
                                    <td>{p.unit.name} ({p.unit.abbreviation})</td>
                                    <td className="amount-cell">₹{p.costPrice.toFixed(2)}</td>
                                    <td>
                                        <span className={`vendor-status-badge ${p.isActive ? "active" : "inactive"}`}>
                                            {p.isActive ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                                            {p.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="table-action-btn" onClick={() => { setEditingProduct(p); setModalOpen(true); }}>
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Modal placeholder - full implementation would connect to product save API */}
            {modalOpen && (
                <div className="modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingProduct ? "Edit Product" : "New Product"}</h2>
                            <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
                        </div>
                        <div className="vendor-form">
                            <p className="muted" style={{marginBottom: "1rem"}}>Product formulation is managed centrally. Local site stock limits are handled in Inventory.</p>
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Product Name *</label>
                                    <input type="text" defaultValue={editingProduct?.name || ""} placeholder="e.g. Portland Cement 50kg" />
                                </div>
                                <div className="form-group">
                                    <label>SKU / Barcode</label>
                                    <input type="text" defaultValue={editingProduct?.sku || ""} placeholder="Global SKU identifier" />
                                </div>
                            </div>
                            <div className="modal-footer" style={{marginTop: "1.5rem", padding: "1rem 0 0"}}>
                                <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleSave}>Save Product</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
