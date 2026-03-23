import React, { useEffect, useState } from "react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
    TrendingUp, Package, ShoppingCart, AlertTriangle,
    BarChart2, DollarSign, CheckCircle, Clock, RefreshCw
} from "lucide-react";
import { apiClient } from "../../services/api";

interface KPIs {
    totalInventoryValue?: number;
    lowStockCount?: number;
    pendingRequests?: number;
    pendingPOs?: number;
    fulfillmentRate?: number;
    monthlySpend?: number;
    totalItems?: number;
    totalVendors?: number;
}

interface Trend {
    date: string;
    inbound: number;
    outbound: number;
}

interface TopItem {
    name: string;
    totalConsumed: number;
    movementCount: number;
}

interface DistributionItem {
    status: string;
    count: number;
}

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const KPICard = ({
    title, value, subtitle, icon: Icon, color, change
}: {
    title: string; value: string; subtitle?: string;
    icon: React.ElementType; color: string; change?: string;
}) => (
    <div className="analytics-kpi-card" style={{ "--card-color": color } as React.CSSProperties}>
        <div className="analytics-kpi-header">
            <div className="analytics-kpi-icon" style={{ background: `${color}20`, color }}>
                <Icon size={22} />
            </div>
            {change && <span className="analytics-kpi-change">{change}</span>}
        </div>
        <div className="analytics-kpi-value">{value}</div>
        <div className="analytics-kpi-title">{title}</div>
        {subtitle && <div className="analytics-kpi-subtitle">{subtitle}</div>}
    </div>
);

const AnalyticsDashboard = () => {
    const [kpis, setKpis] = useState<KPIs>({});
    const [trends, setTrends] = useState<Trend[]>([]);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [distribution, setDistribution] = useState<DistributionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const [kpiRes, trendRes, topRes, distRes] = await Promise.allSettled([
                apiClient.analytics.kpis(),
                apiClient.analytics.stockTrends({ days: 30 }),
                apiClient.analytics.topConsumed({ days: 30, limit: 8 }),
                apiClient.analytics.requestDistribution(),
            ]);

            if (kpiRes.status === "fulfilled") setKpis(kpiRes.value.data.data as KPIs || {});
            if (trendRes.status === "fulfilled") setTrends((trendRes.value.data.data as { trends: Trend[] })?.trends || []);
            if (topRes.status === "fulfilled") setTopItems((topRes.value.data.data as { items: TopItem[] })?.items || []);
            if (distRes.status === "fulfilled") setDistribution((distRes.value.data.data as { distribution: DistributionItem[] })?.distribution || []);
        } catch (error) {
            console.error("Analytics load error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleRefresh = () => { setRefreshing(true); loadData(); };

    const fmt = (n?: number, prefix = "") => {
        if (n === undefined || n === null) return "—";
        if (n >= 10000000) return `${prefix}${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `${prefix}${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `${prefix}${(n / 1000).toFixed(1)}K`;
        return `${prefix}${n.toFixed(0)}`;
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <div className="analytics-spinner" />
                <p>Loading analytics...</p>
            </div>
        );
    }

    return (
        <div className="analytics-dashboard">
            {/* Header */}
            <div className="analytics-header">
                <div>
                    <h1>Analytics & Insights</h1>
                    <p>Real-time overview of your inventory operations</p>
                </div>
                <button className="analytics-refresh-btn" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {/* KPI Grid */}
            <div className="analytics-kpi-grid">
                <KPICard
                    title="Inventory Value"
                    value={fmt(kpis.totalInventoryValue, "₹")}
                    subtitle="Total stock value"
                    icon={DollarSign}
                    color="#6366f1"
                />
                <KPICard
                    title="Low Stock Items"
                    value={String(kpis.lowStockCount ?? "—")}
                    subtitle="Need reorder"
                    icon={AlertTriangle}
                    color="#ef4444"
                />
                <KPICard
                    title="Pending Requests"
                    value={String(kpis.pendingRequests ?? "—")}
                    subtitle="Awaiting action"
                    icon={Clock}
                    color="#f59e0b"
                />
                <KPICard
                    title="Open Purchase Orders"
                    value={String(kpis.pendingPOs ?? "—")}
                    subtitle="In progress"
                    icon={ShoppingCart}
                    color="#22d3ee"
                />
                <KPICard
                    title="Fulfillment Rate"
                    value={kpis.fulfillmentRate !== undefined ? `${kpis.fulfillmentRate.toFixed(1)}%` : "—"}
                    subtitle="Requests completed"
                    icon={CheckCircle}
                    color="#10b981"
                />
                <KPICard
                    title="Monthly Spend"
                    value={fmt(kpis.monthlySpend, "₹")}
                    subtitle="This month"
                    icon={TrendingUp}
                    color="#8b5cf6"
                />
                <KPICard
                    title="Total Items"
                    value={String(kpis.totalItems ?? "—")}
                    subtitle="Across all sites"
                    icon={Package}
                    color="#06b6d4"
                />
                <KPICard
                    title="Active Vendors"
                    value={String(kpis.totalVendors ?? "—")}
                    subtitle="Registered vendors"
                    icon={BarChart2}
                    color="#ec4899"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="analytics-charts-row">
                {/* Stock Movement Trend */}
                <div className="analytics-chart-card wide">
                    <div className="analytics-chart-header">
                        <h3>Stock Movement (Last 30 Days)</h3>
                        <span className="chart-badge">Daily</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                            />
                            <Legend wrapperStyle={{ color: "#94a3b8" }} />
                            <Area type="monotone" dataKey="inbound" stroke="#6366f1" fill="url(#inboundGrad)" strokeWidth={2} name="Inbound" />
                            <Area type="monotone" dataKey="outbound" stroke="#22d3ee" fill="url(#outboundGrad)" strokeWidth={2} name="Outbound" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Request Distribution */}
                <div className="analytics-chart-card">
                    <div className="analytics-chart-header">
                        <h3>Request Status</h3>
                        <span className="chart-badge">Breakdown</span>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="count"
                                nameKey="status"
                            >
                                {distribution.map((_, index) => (
                                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                            />
                            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="analytics-charts-row">
                {/* Top Consumed Items */}
                <div className="analytics-chart-card wide">
                    <div className="analytics-chart-header">
                        <h3>Top Consumed Items</h3>
                        <span className="chart-badge">Last 30 Days</span>
                    </div>
                    {topItems.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                                    tickLine={false}
                                    width={130}
                                    tickFormatter={(v: string) => v.length > 20 ? v.substring(0, 20) + "…" : v}
                                />
                                <Tooltip
                                    contentStyle={{ background: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f1f5f9" }}
                                />
                                <Bar dataKey="totalConsumed" fill="#6366f1" radius={[0, 4, 4, 0]} name="Qty Consumed" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="analytics-no-data">
                            <Package size={32} />
                            <p>No consumption data yet</p>
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="analytics-chart-card analytics-summary-panel">
                    <div className="analytics-chart-header">
                        <h3>Quick Stats</h3>
                    </div>
                    <div className="analytics-quick-stats">
                        {[
                            { label: "Total Inventory Value", value: fmt(kpis.totalInventoryValue, "₹"), color: "#6366f1" },
                            { label: "Items Needing Reorder", value: String(kpis.lowStockCount ?? 0), color: "#ef4444" },
                            { label: "Fulfillment Rate", value: kpis.fulfillmentRate ? `${kpis.fulfillmentRate.toFixed(1)}%` : "N/A", color: "#10b981" },
                            { label: "Total Registered Vendors", value: String(kpis.totalVendors ?? 0), color: "#f59e0b" },
                            { label: "Active SKUs in Catalog", value: String(kpis.totalItems ?? 0), color: "#22d3ee" },
                            { label: "Monthly Procurement Spend", value: fmt(kpis.monthlySpend, "₹"), color: "#8b5cf6" },
                        ].map((s, i) => (
                            <div key={i} className="analytics-quick-stat">
                                <div className="analytics-quick-stat-dot" style={{ background: s.color }} />
                                <div className="analytics-quick-stat-content">
                                    <span className="analytics-quick-stat-label">{s.label}</span>
                                    <span className="analytics-quick-stat-value" style={{ color: s.color }}>{s.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
