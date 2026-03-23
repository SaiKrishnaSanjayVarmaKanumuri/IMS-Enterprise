import React, { useEffect, useState } from "react";
import { Plus, Search, Star, Phone, Mail, MapPin, ExternalLink, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { apiClient } from "../../services/api";

interface Vendor {
    id: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    contactPerson?: string;
    city?: string;
    state?: string;
    gstNumber?: string;
    paymentTerms?: number;
    creditLimit?: number;
    rating?: number;
    isActive: boolean;
    createdAt: string;
}

const StarRating = ({ rating }: { rating?: number }) => {
    const r = rating || 0;
    return (
        <div className="vendor-rating">
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={13} className={i <= Math.round(r) ? "star filled" : "star"} />
            ))}
            <span>{r.toFixed(1)}</span>
        </div>
    );
};

const VendorFormModal = ({ vendor, onClose, onSave }: {
    vendor?: Vendor | null;
    onClose: () => void;
    onSave: () => void;
}) => {
    const [form, setForm] = useState({
        name: vendor?.name || "",
        email: vendor?.email || "",
        phone: vendor?.phone || "",
        contactPerson: vendor?.contactPerson || "",
        city: vendor?.city || "",
        state: vendor?.state || "",
        gstNumber: vendor?.gstNumber || "",
        paymentTerms: String(vendor?.paymentTerms || 30),
        creditLimit: String(vendor?.creditLimit || 0),
        rating: String(vendor?.rating || 4),
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const payload = {
                ...form,
                paymentTerms: Number(form.paymentTerms),
                creditLimit: Number(form.creditLimit),
                rating: Number(form.rating),
            };
            if (vendor) {
                await apiClient.vendors.update(vendor.id, payload);
            } else {
                await apiClient.vendors.create(payload);
            }
            onSave();
            onClose();
        } catch (err: unknown) {
            setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed to save vendor");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container vendor-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{vendor ? "Edit Vendor" : "Add New Vendor"}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="vendor-form">
                    {error && <div className="form-error">{error}</div>}
                    <div className="form-grid-2">
                        <div className="form-group">
                            <label>Company Name *</label>
                            <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="BuildMart Supplies" />
                        </div>
                        <div className="form-group">
                            <label>Contact Person</label>
                            <input value={form.contactPerson} onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))} placeholder="John Doe" />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="vendor@example.com" />
                        </div>
                        <div className="form-group">
                            <label>Phone</label>
                            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91-9876543210" />
                        </div>
                        <div className="form-group">
                            <label>City</label>
                            <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Mumbai" />
                        </div>
                        <div className="form-group">
                            <label>State</label>
                            <input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="Maharashtra" />
                        </div>
                        <div className="form-group">
                            <label>GST Number</label>
                            <input value={form.gstNumber} onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))} placeholder="27AABCS1234A1Z5" />
                        </div>
                        <div className="form-group">
                            <label>Payment Terms (days)</label>
                            <input type="number" value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))} min="0" max="365" />
                        </div>
                        <div className="form-group">
                            <label>Credit Limit (₹)</label>
                            <input type="number" value={form.creditLimit} onChange={e => setForm(p => ({ ...p, creditLimit: e.target.value }))} min="0" />
                        </div>
                        <div className="form-group">
                            <label>Rating (1-5)</label>
                            <input type="number" value={form.rating} onChange={e => setForm(p => ({ ...p, rating: e.target.value }))} min="1" max="5" step="0.1" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? "Saving..." : vendor ? "Update Vendor" : "Add Vendor"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const VendorsPage = () => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editVendor, setEditVendor] = useState<Vendor | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const loadVendors = async () => {
        setLoading(true);
        try {
            const res = await apiClient.vendors.list({ search: search || undefined, limit: 50 });
            const data = res.data.data as { vendors: Vendor[]; pagination: { total: number } };
            setVendors(data.vendors || []);
            setTotalCount(data.pagination?.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadVendors(); }, []);
    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); loadVendors(); };

    const handleToggleActive = async (vendor: Vendor) => {
        try {
            await apiClient.vendors.update(vendor.id, { isActive: !vendor.isActive });
            loadVendors();
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deactivate this vendor?")) return;
        try { await apiClient.vendors.delete(id); loadVendors(); } catch (e) { console.error(e); }
    };

    return (
        <div className="vendors-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Vendor Management</h1>
                    <p>{totalCount} vendor{totalCount !== 1 ? "s" : ""} registered</p>
                </div>
                <button className="btn-primary" onClick={() => { setEditVendor(null); setShowModal(true); }}>
                    <Plus size={16} /> Add Vendor
                </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="search-bar-form">
                <div className="search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search vendors by name, code, city..."
                        className="search-input"
                    />
                </div>
                <button type="submit" className="btn-secondary">Search</button>
            </form>

            {/* Vendor Grid */}
            {loading ? (
                <div className="page-loading"><div className="analytics-spinner" /><p>Loading vendors...</p></div>
            ) : vendors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏢</div>
                    <h3>No vendors found</h3>
                    <p>Add your first vendor to get started with procurement</p>
                    <button className="btn-primary" onClick={() => { setEditVendor(null); setShowModal(true); }}>
                        <Plus size={16} /> Add First Vendor
                    </button>
                </div>
            ) : (
                <div className="vendors-grid">
                    {vendors.map(vendor => (
                        <div key={vendor.id} className={`vendor-card ${!vendor.isActive ? "inactive" : ""}`}>
                            <div className="vendor-card-header">
                                <div className="vendor-avatar">
                                    {vendor.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="vendor-card-info">
                                    <h3>{vendor.name}</h3>
                                    <span className="vendor-code">{vendor.code}</span>
                                    <StarRating rating={vendor.rating} />
                                </div>
                                <div className={`vendor-status-badge ${vendor.isActive ? "active" : "inactive"}`}>
                                    {vendor.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    {vendor.isActive ? "Active" : "Inactive"}
                                </div>
                            </div>

                            <div className="vendor-card-body">
                                {vendor.contactPerson && (
                                    <div className="vendor-detail">
                                        <span className="vendor-detail-label">Contact</span>
                                        <span>{vendor.contactPerson}</span>
                                    </div>
                                )}
                                {vendor.email && (
                                    <div className="vendor-detail">
                                        <Mail size={12} />
                                        <span>{vendor.email}</span>
                                    </div>
                                )}
                                {vendor.phone && (
                                    <div className="vendor-detail">
                                        <Phone size={12} />
                                        <span>{vendor.phone}</span>
                                    </div>
                                )}
                                {(vendor.city || vendor.state) && (
                                    <div className="vendor-detail">
                                        <MapPin size={12} />
                                        <span>{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>
                                    </div>
                                )}
                                {vendor.gstNumber && (
                                    <div className="vendor-detail">
                                        <ExternalLink size={12} />
                                        <span>GST: {vendor.gstNumber}</span>
                                    </div>
                                )}
                            </div>

                            <div className="vendor-card-footer">
                                <div className="vendor-metric">
                                    <span className="vendor-metric-label">Payment Terms</span>
                                    <span className="vendor-metric-value">{vendor.paymentTerms ?? "—"} days</span>
                                </div>
                                <div className="vendor-metric">
                                    <span className="vendor-metric-label">Credit Limit</span>
                                    <span className="vendor-metric-value">
                                        {vendor.creditLimit ? `₹${(vendor.creditLimit / 100000).toFixed(1)}L` : "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="vendor-actions">
                                <button className="vendor-action-btn" onClick={() => { setEditVendor(vendor); setShowModal(true); }}>
                                    <Edit2 size={13} /> Edit
                                </button>
                                <button
                                    className={`vendor-action-btn ${vendor.isActive ? "deactivate" : "activate"}`}
                                    onClick={() => handleToggleActive(vendor)}
                                >
                                    {vendor.isActive ? <XCircle size={13} /> : <CheckCircle size={13} />}
                                    {vendor.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button className="vendor-action-btn danger" onClick={() => handleDelete(vendor.id)}>
                                    <Trash2 size={13} /> Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <VendorFormModal
                    vendor={editVendor}
                    onClose={() => setShowModal(false)}
                    onSave={loadVendors}
                />
            )}
        </div>
    );
};

export default VendorsPage;
