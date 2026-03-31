import { useState, useEffect } from "react";
import { ClipboardCheck, RefreshCw, CheckCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { apiClient } from "../../services/api";

interface Site { id: string; name: string; code: string; }
interface InventoryItem { id: string; name: string; code: string; currentStock: number; unit: string; }

const REASONS = [
    "Physical count correction",
    "Damaged goods",
    "Theft / Loss",
    "Found excess stock",
    "Data entry error",
    "Wastage",
    "Other",
];

export default function InventoryAdjustPage() {
    const [sites, setSites] = useState<Site[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [form, setForm] = useState({ siteId: "", itemId: "", newCount: "", reason: "", notes: "" });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        apiClient.sites.list().then(r => setSites((r.data.data as { sites: Site[] }).sites || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (!form.siteId) return;
        apiClient.inventory.list({ siteId: form.siteId, limit: 200 })
            .then(r => setItems((r.data.data as { items: InventoryItem[] }).items || []))
            .catch(() => {});
    }, [form.siteId]);

    const selectedItem = items.find(i => i.id === form.itemId);
    const newCount = form.newCount !== "" ? Number(form.newCount) : null;
    const diff = selectedItem && newCount !== null ? newCount - selectedItem.currentStock : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!form.itemId || form.newCount === "" || !form.reason) { setError("Please fill all required fields."); return; }
        if (newCount !== null && newCount < 0) { setError("Stock count cannot be negative."); return; }
        setLoading(true);
        try {
            await apiClient.inventory.adjust({
                itemId: form.itemId,
                newQuantity: newCount!,
                reason: form.reason,
                notes: form.notes,
            });
            setSuccess(true);
            setForm({ siteId: "", itemId: "", newCount: "", reason: "", notes: "" });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e?.response?.data?.error || "Adjustment failed. Please try again.");
        }
        setLoading(false);
    };

    if (success) return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: "1rem", animation: "fadeIn 0.3s ease" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 style={{ color: "#f1f5f9", margin: 0 }}>Adjustment Recorded!</h2>
            <p style={{ color: "#94a3b8", margin: 0 }}>Inventory count has been updated and logged.</p>
            <button className="btn-primary" onClick={() => setSuccess(false)}><RefreshCw size={16} /> New Adjustment</button>
        </div>
    );

    return (
        <div className="vendors-page">
            <div className="page-header">
                <div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}><ClipboardCheck size={24} /> Adjust Inventory Count</h1>
                    <p>Correct stock quantities with an audit trail</p>
                </div>
            </div>

            <div style={{ maxWidth: 600, background: "var(--ims-surface)", border: "1px solid var(--ims-border)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--ims-border)", background: "rgba(132,204,22,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#a3e635", fontSize: "0.9375rem", fontWeight: 600 }}>
                        <ClipboardCheck size={20} /> Inventory Adjustment Form
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
                    {error && <div className="form-error">{error}</div>}

                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <label>📍 Site</label>
                        <select className="filter-select" style={{ width: "100%" }} value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value, itemId: "" }))}>
                            <option value="">— Select site —</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                        <label>📦 Item</label>
                        <select className="filter-select" style={{ width: "100%" }} value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))}>
                            <option value="">— Select item —</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name} — Current: {i.currentStock} {i.unit}</option>)}
                        </select>
                    </div>

                    {selectedItem && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--ims-border)", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Current Stock</div>
                            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f1f5f9" }}>{selectedItem.currentStock} <span style={{ fontSize: "1rem", color: "#94a3b8" }}>{selectedItem.unit}</span></div>
                            {diff !== null && diff !== 0 && (
                                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                    {diff > 0
                                        ? <><TrendingUp size={16} color="#10b981" /><span style={{ color: "#10b981", fontWeight: 600 }}>+{diff} increase</span></>
                                        : <><TrendingDown size={16} color="#ef4444" /><span style={{ color: "#ef4444", fontWeight: 600 }}>{diff} decrease</span></>
                                    }
                                </div>
                            )}
                            {diff === 0 && <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}><Minus size={14} color="#94a3b8" /><span style={{ color: "#94a3b8" }}>No change</span></div>}
                        </div>
                    )}

                    <div className="form-grid-2" style={{ marginBottom: "1.25rem" }}>
                        <div className="form-group">
                            <label>🔢 Actual Count (New) *</label>
                            <input type="number" min="0" placeholder="Enter correct quantity" value={form.newCount} onChange={e => setForm(f => ({ ...f, newCount: e.target.value }))} required />
                        </div>
                        <div className="form-group">
                            <label>📋 Reason *</label>
                            <select className="filter-select" style={{ width: "100%" }} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required>
                                <option value="">— Select reason —</option>
                                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                        <label>📝 Additional Notes</label>
                        <input type="text" placeholder="Optional notes for audit trail..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                        <ClipboardCheck size={16} />{loading ? "Saving..." : "Record Adjustment"}
                    </button>
                </form>
            </div>
        </div>
    );
}
