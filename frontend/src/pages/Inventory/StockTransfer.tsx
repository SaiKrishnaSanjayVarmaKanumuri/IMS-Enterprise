import { useState, useEffect } from "react";
import { ArrowLeftRight, RefreshCw, CheckCircle, Package, Send } from "lucide-react";
import { apiClient } from "../../services/api";

interface Site { id: string; name: string; code: string; }
interface InventoryItem { id: string; name: string; code: string; currentStock: number; unit: string; }

export default function StockTransferPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [form, setForm] = useState({ fromSiteId: "", toSiteId: "", itemId: "", quantity: "", reason: "" });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        apiClient.sites.list().then(r => setSites((r.data.data as { sites: Site[] }).sites || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!form.fromSiteId) return;
        apiClient.inventory.list({ siteId: form.fromSiteId, limit: 200 })
            .then(r => setItems((r.data.data as { items: InventoryItem[] }).items || []))
            .catch(() => {});
    }, [form.fromSiteId]);

    const selectedItem = items.find(i => i.id === form.itemId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (form.fromSiteId === form.toSiteId) { setError("Source and destination site must be different."); return; }
        if (!form.itemId || !form.quantity || Number(form.quantity) <= 0) { setError("Please fill all fields correctly."); return; }
        if (selectedItem && Number(form.quantity) > selectedItem.currentStock) {
            setError(`Only ${selectedItem.currentStock} ${selectedItem.unit} available.`); return;
        }
        setLoading(true);
        try {
            await apiClient.inventory.transfer({
                fromSiteId: form.fromSiteId,
                toSiteId: form.toSiteId,
                itemId: form.itemId,
                quantity: Number(form.quantity),
                reason: form.reason || "Site transfer",
            });
            setSuccess(true);
            setForm({ fromSiteId: "", toSiteId: "", itemId: "", quantity: "", reason: "" });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e?.response?.data?.error || "Transfer failed. Please try again.");
        }
        setLoading(false);
    };

    if (success) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: "1rem", animation: "fadeIn 0.3s ease" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ color: "#f1f5f9", margin: 0 }}>Transfer Complete!</h2>
            <p style={{ color: "#94a3b8", margin: 0 }}>Stock has been moved successfully between sites.</p>
            <button className="btn-primary" onClick={() => setSuccess(false)}><RefreshCw size={16} /> New Transfer</button>
        </div>
    );

    return (
        <div className="vendors-page">
            <div className="page-header">
                <div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}><ArrowLeftRight size={24} /> Transfer Stock</h1>
                    <p>Move inventory items from one site to another</p>
                </div>
            </div>

            <div style={{ maxWidth: 600, background: "var(--ims-surface)", border: "1px solid var(--ims-border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--ims-border)", background: "rgba(6,182,212,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#67e8f9", fontSize: "0.9375rem", fontWeight: 600 }}>
                        <Package size={20} /> Stock Transfer Form
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
                    {error && <div className="form-error">{error}</div>}

                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <label>📍 From Site (Source)</label>
                        <select className="filter-select" style={{ width: "100%" }} value={form.fromSiteId} onChange={e => setForm(f => ({ ...f, fromSiteId: e.target.value, itemId: "" }))}>
                            <option value="">— Select source site —</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <label>📦 Item to Transfer</label>
                        <select className="filter-select" style={{ width: "100%" }} value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))}>
                            <option value="">— Select item —</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name} (Available: {i.currentStock} {i.unit})</option>)}
                        </select>
                        {selectedItem && (
                            <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                                <span className="chip cyan"><Package size={12} /> {selectedItem.currentStock} {selectedItem.unit} available</span>
                            </div>
                        )}
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <label>🎯 To Site (Destination)</label>
                        <select className="filter-select" style={{ width: "100%" }} value={form.toSiteId} onChange={e => setForm(f => ({ ...f, toSiteId: e.target.value }))}>
                            <option value="">— Select destination site —</option>
                            {sites.filter(s => s.id !== form.fromSiteId).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>

                    <div className="form-grid-2" style={{ marginBottom: "1.25rem" }}>
                        <div className="form-group">
                            <label>🔢 Quantity</label>
                            <input type="number" min="1" max={selectedItem?.currentStock} placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label>📝 Reason (optional)</label>
                            <input type="text" placeholder="e.g. Project reallocation" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                        <Send size={16} />{loading ? "Transferring..." : "Transfer Stock"}
                    </button>
                </form>
            </div>
        </div>
    );
}
