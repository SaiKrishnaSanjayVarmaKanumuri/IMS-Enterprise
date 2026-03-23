import { useEffect, useState } from "react";
import { Search, Download, Eye, CheckCircle, XCircle, Truck, Filter } from "lucide-react";
import { apiClient } from "../../services/api";

interface PurchaseOrder {
    id: string;
    poNumber: string;
    status: string;
    orderDate: string;
    expectedDate?: string;
    totalAmount: number;
    vendor: { name: string; code: string };
    site: { name: string; code: string };
    createdBy: { firstName: string; lastName: string };
    items?: Array<{
        id: string;
        product: { name: string; sku: string };
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }>;
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: "#94a3b8",
    CONFIRMED: "#6366f1",
    PARTIAL: "#f59e0b",
    RECEIVED: "#10b981",
    CANCELLED: "#ef4444",
};

const StatusBadge = ({ status }: { status: string }) => (
    <span className="po-status-badge" style={{ background: `${STATUS_COLORS[status] || "#94a3b8"}20`, color: STATUS_COLORS[status] || "#94a3b8" }}>
        {status}
    </span>
);

const PurchaseOrdersPage = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await apiClient.purchaseOrders.list({
                status: statusFilter || undefined,
                limit: 50,
            });
            const data = res.data.data as { purchaseOrders: PurchaseOrder[]; pagination: { total: number } };
            setOrders(data.purchaseOrders || []);
            setTotalCount(data.pagination?.total || 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadOrders(); }, [statusFilter]);

    const handleConfirm = async (id: string) => {
        try { await apiClient.purchaseOrders.confirm(id); loadOrders(); } catch (e) { console.error(e); }
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Cancel this purchase order?")) return;
        try { await apiClient.purchaseOrders.cancel(id); loadOrders(); } catch (e) { console.error(e); }
    };

    const handleViewDetails = async (po: PurchaseOrder) => {
        try {
            const res = await apiClient.purchaseOrders.get(po.id);
            setSelectedPO((res.data.data as { purchaseOrder: PurchaseOrder }).purchaseOrder);
        } catch (e) { console.error(e); }
    };

    const filteredOrders = orders.filter(o =>
        !search ||
        o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.vendor.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="po-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1>Purchase Orders</h1>
                    <p>{totalCount} purchase order{totalCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="page-header-actions">
                    <a
                        href="/api/reports/purchase-orders/csv"
                        className="btn-secondary"
                        download
                    >
                        <Download size={16} /> Export CSV
                    </a>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search PO number, vendor..."
                        className="search-input"
                    />
                </div>
                <div className="filter-select-wrap">
                    <Filter size={14} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                        <option value="">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="RECEIVED">Received</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="page-loading"><div className="analytics-spinner" /><p>Loading purchase orders...</p></div>
            ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No purchase orders</h3>
                    <p>Purchase orders will appear here once created through procurement workflows</p>
                </div>
            ) : (
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Vendor</th>
                                <th>Site</th>
                                <th>Order Date</th>
                                <th>Expected</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(po => (
                                <tr key={po.id} className={selectedPO?.id === po.id ? "row-selected" : ""}>
                                    <td>
                                        <span className="po-number">{po.poNumber}</span>
                                    </td>
                                    <td>
                                        <div className="vendor-cell">
                                            <span className="vendor-name">{po.vendor.name}</span>
                                            <span className="vendor-code-small">{po.vendor.code}</span>
                                        </div>
                                    </td>
                                    <td>{po.site.name}</td>
                                    <td>{new Date(po.orderDate).toLocaleDateString("en-IN")}</td>
                                    <td>{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("en-IN") : "—"}</td>
                                    <td className="amount-cell">₹{po.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                    <td><StatusBadge status={po.status} /></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="table-action-btn" title="View Details" onClick={() => handleViewDetails(po)}>
                                                <Eye size={14} />
                                            </button>
                                            {po.status === "DRAFT" && (
                                                <button className="table-action-btn confirm" title="Confirm PO" onClick={() => handleConfirm(po.id)}>
                                                    <CheckCircle size={14} />
                                                </button>
                                            )}
                                            {(po.status === "CONFIRMED" || po.status === "PARTIAL") && (
                                                <button className="table-action-btn receive" title="Receive Goods" onClick={() => handleViewDetails(po)}>
                                                    <Truck size={14} />
                                                </button>
                                            )}
                                            {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                                                <button className="table-action-btn danger" title="Cancel PO" onClick={() => handleCancel(po.id)}>
                                                    <XCircle size={14} />
                                                </button>
                                            )}
                                            <a
                                                href={`/api/reports/purchase-orders/${po.id}/pdf`}
                                                className="table-action-btn"
                                                title="Download PDF"
                                                download
                                            >
                                                <Download size={14} />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PO Detail Drawer */}
            {selectedPO && (
                <div className="po-detail-overlay" onClick={() => setSelectedPO(null)}>
                    <div className="po-detail-drawer" onClick={e => e.stopPropagation()}>
                        <div className="po-detail-header">
                            <div>
                                <h2>{selectedPO.poNumber}</h2>
                                <StatusBadge status={selectedPO.status} />
                            </div>
                            <button className="modal-close" onClick={() => setSelectedPO(null)}>×</button>
                        </div>
                        <div className="po-detail-body">
                            <div className="po-detail-grid">
                                <div className="po-detail-section">
                                    <h4>Vendor</h4>
                                    <p>{selectedPO.vendor.name}</p>
                                    <span className="muted">{selectedPO.vendor.code}</span>
                                </div>
                                <div className="po-detail-section">
                                    <h4>Delivery Site</h4>
                                    <p>{selectedPO.site.name}</p>
                                    <span className="muted">{selectedPO.site.code}</span>
                                </div>
                                <div className="po-detail-section">
                                    <h4>Order Date</h4>
                                    <p>{new Date(selectedPO.orderDate).toLocaleDateString("en-IN")}</p>
                                </div>
                                <div className="po-detail-section">
                                    <h4>Expected Date</h4>
                                    <p>{selectedPO.expectedDate ? new Date(selectedPO.expectedDate).toLocaleDateString("en-IN") : "Not set"}</p>
                                </div>
                            </div>

                            {selectedPO.items && selectedPO.items.length > 0 && (
                                <div className="po-items-section">
                                    <h4>Line Items</h4>
                                    <table className="po-items-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>SKU</th>
                                                <th>Qty</th>
                                                <th>Unit Price</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPO.items.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.product.name}</td>
                                                    <td className="muted">{item.product.sku}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>₹{item.unitPrice.toFixed(2)}</td>
                                                    <td className="amount-cell">₹{item.totalPrice.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={4} className="total-label">Total Amount</td>
                                                <td className="amount-cell total-value">₹{selectedPO.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="po-detail-footer">
                            <a href={`/api/reports/purchase-orders/${selectedPO.id}/pdf`} className="btn-primary" download>
                                <Download size={15} /> Download PDF
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrdersPage;
