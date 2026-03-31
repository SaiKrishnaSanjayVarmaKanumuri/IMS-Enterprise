import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../services/api";
import {
    Package, BarChart2, AlertTriangle, ShoppingCart, CheckSquare,
    Building2, PlusCircle, FileText, DollarSign, Users, ArrowLeftRight,
    ClipboardCheck, Layers, TrendingUp, Clock
} from "lucide-react";

interface KPIData {
    totalInventoryValue?: number;
    lowStockCount?: number;
    pendingRequests?: number;
    openPurchaseOrders?: number;
    fulfillmentRate?: number;
    totalItems?: number;
    activeVendors?: number;
    monthlySpend?: number;
}

const Dashboard: React.FC = () => {
    const { hasRole } = useAuth();
    if (hasRole("ADMIN")) return <AdminDashboard />;
    if (hasRole("SITE_ENGINEER")) return <EngineerDashboard />;
    if (hasRole("PROCUREMENT")) return <ProcurementDashboard />;
    if (hasRole("FINANCE")) return <FinanceDashboard />;
    if (hasRole("FRONT_MAN")) return <FMDashboard />;
    return (
        <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
            <Package size={48} style={{ marginBottom: "1rem" }} />
            <p>Your dashboard is loading...</p>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [kpis, setKpis] = useState<KPIData>({});

    useEffect(() => {
        apiClient.analytics.kpis().then(r => setKpis(r.data.data as KPIData)).catch(() => {});
    }, []);

    const tiles = [
        { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)", count: kpis.totalItems ?? "—", badge: null },
        { label: "Low Stock Alerts", icon: <AlertTriangle size={26} />, path: "/inventory/alerts", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", count: kpis.lowStockCount ?? 0, badge: kpis.lowStockCount ? String(kpis.lowStockCount) : null, badgeClass: "yellow" },
        { label: "Analytics", icon: <BarChart2 size={26} />, path: "/analytics", color: "#22d3ee", bg: "rgba(34,211,238,0.15)", count: null, badge: null },
        { label: "Product Catalog", icon: <Layers size={26} />, path: "/products", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)", count: null, badge: null },
        { label: "Vendors", icon: <Building2 size={26} />, path: "/vendors", color: "#a855f7", bg: "rgba(168,85,247,0.15)", count: kpis.activeVendors ?? "—", badge: null },
        { label: "Purchase Orders", icon: <ShoppingCart size={26} />, path: "/purchase-orders", color: "#3b82f6", bg: "rgba(59,130,246,0.15)", count: kpis.openPurchaseOrders ?? 0, badge: kpis.openPurchaseOrders ? String(kpis.openPurchaseOrders) : null, badgeClass: "" },
        { label: "Transfer Stock", icon: <ArrowLeftRight size={26} />, path: "/inventory/transfer", color: "#06b6d4", bg: "rgba(6,182,212,0.15)", count: null, badge: null },
        { label: "Adjust Count", icon: <ClipboardCheck size={26} />, path: "/inventory/adjust", color: "#84cc16", bg: "rgba(132,204,22,0.15)", count: null, badge: null },
        { label: "Manage Users", icon: <Users size={26} />, path: "/admin/users", color: "#6366f1", bg: "rgba(99,102,241,0.15)", count: null, badge: null },
    ];

    return (
        <div className="home-dashboard">
            <div className="home-greeting">
                <h1>👋 Welcome back, {user?.firstName}!</h1>
                <p>You have full admin access. Here's your operational overview.</p>
            </div>

            <div className="home-tiles-grid">
                {tiles.map(t => (
                    <Link
                        key={t.path}
                        to={t.path}
                        className="home-tile"
                        style={{ "--tile-color": t.color, "--tile-bg": t.bg } as React.CSSProperties}
                    >
                        {t.badge && <span className={`home-tile-badge ${t.badgeClass || ""}`}>{t.badge}</span>}
                        <div className="home-tile-icon">{t.icon}</div>
                        <div className="home-tile-body">
                            {t.count !== null && <div className="home-tile-count">{typeof t.count === "number" ? t.count.toLocaleString() : t.count}</div>}
                            <div className="home-tile-label">{t.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="home-recent-section">
                <div className="home-recent-header">
                    <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={18} /> Quick Stats</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1px", background: "rgba(255,255,255,0.04)" }}>
                    {[
                        { label: "Inventory Value", value: `₹${(kpis.totalInventoryValue ?? 0).toLocaleString()}`, color: "#10b981" },
                        { label: "Monthly Spend", value: `₹${(kpis.monthlySpend ?? 0).toLocaleString()}`, color: "#6366f1" },
                        { label: "Fulfillment Rate", value: `${(kpis.fulfillmentRate ?? 0).toFixed(1)}%`, color: "#22d3ee" },
                        { label: "Pending Requests", value: String(kpis.pendingRequests ?? 0), color: "#f59e0b" },
                    ].map(s => (
                        <div key={s.label} style={{ padding: "1.25rem", background: "var(--ims-surface)" }}>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.375rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
                            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const EngineerDashboard: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="home-dashboard">
            <div className="home-greeting">
                <h1>👷 Hello, {user?.firstName}!</h1>
                <p>Site Engineer — Review pending material requests from your team.</p>
            </div>
            <div className="home-tiles-grid">
                {[
                    { label: "Review Requests", icon: <CheckSquare size={26} />, path: "/engineer/approvals", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
                    { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Low Stock", icon: <AlertTriangle size={26} />, path: "/inventory/alerts", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
                    { label: "Analytics", icon: <BarChart2 size={26} />, path: "/analytics", color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
                ].map(t => (
                    <Link key={t.path} to={t.path} className="home-tile" style={{ "--tile-color": t.color, "--tile-bg": t.bg } as React.CSSProperties}>
                        <div className="home-tile-icon">{t.icon}</div>
                        <div className="home-tile-body"><div className="home-tile-label">{t.label}</div></div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const ProcurementDashboard: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="home-dashboard">
            <div className="home-greeting">
                <h1>🛒 Hello, {user?.firstName}!</h1>
                <p>Procurement Manager — Manage vendors and purchase orders.</p>
            </div>
            <div className="home-tiles-grid">
                {[
                    { label: "Vendors", icon: <Building2 size={26} />, path: "/vendors", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
                    { label: "Purchase Orders", icon: <ShoppingCart size={26} />, path: "/purchase-orders", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
                    { label: "Approve Requests", icon: <CheckSquare size={26} />, path: "/procurement/requests", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
                    { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Analytics", icon: <BarChart2 size={26} />, path: "/analytics", color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
                    { label: "Low Stock", icon: <AlertTriangle size={26} />, path: "/inventory/alerts", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
                ].map(t => (
                    <Link key={t.path} to={t.path} className="home-tile" style={{ "--tile-color": t.color, "--tile-bg": t.bg } as React.CSSProperties}>
                        <div className="home-tile-icon">{t.icon}</div>
                        <div className="home-tile-body"><div className="home-tile-label">{t.label}</div></div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const FinanceDashboard: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="home-dashboard">
            <div className="home-greeting">
                <h1>💰 Hello, {user?.firstName}!</h1>
                <p>Finance Officer — Review and approve high-value purchase requests.</p>
            </div>
            <div className="home-tiles-grid">
                {[
                    { label: "Financial Review", icon: <DollarSign size={26} />, path: "/finance/approvals", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Analytics", icon: <BarChart2 size={26} />, path: "/analytics", color: "#22d3ee", bg: "rgba(34,211,238,0.15)" },
                    { label: "Stock Report", icon: <TrendingUp size={26} />, path: "/inventory", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
                ].map(t => (
                    <Link key={t.path} to={t.path} className="home-tile" style={{ "--tile-color": t.color, "--tile-bg": t.bg } as React.CSSProperties}>
                        <div className="home-tile-icon">{t.icon}</div>
                        <div className="home-tile-body"><div className="home-tile-label">{t.label}</div></div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

const FMDashboard: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="home-dashboard">
            <div className="home-greeting">
                <h1>📋 Hello, {user?.firstName}!</h1>
                <p>Front Man — Raise material requests and track your submissions.</p>
            </div>
            <div className="home-tiles-grid">
                {[
                    { label: "New Request", icon: <PlusCircle size={26} />, path: "/fm/requests/new", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
                    { label: "My Requests", icon: <FileText size={26} />, path: "/fm/requests", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
                    { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "History", icon: <Clock size={26} />, path: "/inventory/history", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
                ].map(t => (
                    <Link key={t.path} to={t.path} className="home-tile" style={{ "--tile-color": t.color, "--tile-bg": t.bg } as React.CSSProperties}>
                        <div className="home-tile-icon">{t.icon}</div>
                        <div className="home-tile-body"><div className="home-tile-label">{t.label}</div></div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
