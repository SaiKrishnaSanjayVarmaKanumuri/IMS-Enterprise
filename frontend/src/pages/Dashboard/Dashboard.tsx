import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../services/api";
import {
    Package, AlertTriangle, CheckSquare, PlusCircle, FileText,
    Users, MapPin, ArrowLeftRight, ClipboardCheck, History, ArrowRight
} from "lucide-react";

/**
 * Role-based home screens.
 *
 * Design goal: each role lands on ONE clear primary action ("hero"), backed by
 * a live count, plus a short row of CORE secondary actions. We intentionally do
 * NOT surface enterprise features (purchase orders, vendors, product catalog,
 * tax fields) here — the mental model stays: Sites → Items → Requests → Stock.
 */

// Count role-scoped requests (backend already filters by role). limit=1 so we
// only pay for the pagination total, not the rows.
async function countRequests(status?: string): Promise<number> {
    try {
        const params: Record<string, unknown> = { limit: 1 };
        if (status) params.status = status;
        const r = await apiClient.requests.list(params);
        const data = r.data.data as { pagination?: { total?: number } };
        return data?.pagination?.total ?? 0;
    } catch {
        return 0;
    }
}

async function countLowStock(): Promise<number> {
    try {
        const r = await apiClient.inventory.getLowStockAlerts();
        const data = r.data.data as { lowStockItems?: unknown[] };
        return data?.lowStockItems?.length ?? 0;
    } catch {
        return 0;
    }
}

interface Tile {
    label: string;
    icon: React.ReactNode;
    path: string;
    color: string;
    bg: string;
    count?: number | null;
}

const SecondaryTiles: React.FC<{ tiles: Tile[] }> = ({ tiles }) => (
    <div className="home-tiles-grid">
        {tiles.map((t) => (
            <Link
                key={t.path}
                to={t.path}
                className="home-tile"
                style={{ "--tile-color": t.color, "--tile-bg": t.bg } as React.CSSProperties}
            >
                <div className="home-tile-icon">{t.icon}</div>
                <div className="home-tile-body">
                    {t.count != null && <div className="home-tile-count">{t.count.toLocaleString()}</div>}
                    <div className="home-tile-label">{t.label}</div>
                </div>
            </Link>
        ))}
    </div>
);

interface HeroProps {
    color: string;
    icon: React.ReactNode;
    headline: string;
    sub: string;
    ctaLabel: string;
    ctaPath: string;
}

const Hero: React.FC<HeroProps> = ({ color, icon, headline, sub, ctaLabel, ctaPath }) => (
    <Link to={ctaPath} className="home-hero" style={{ "--hero-color": color } as React.CSSProperties}>
        <div className="home-hero-icon">{icon}</div>
        <div className="home-hero-text">
            <h2>{headline}</h2>
            <p>{sub}</p>
        </div>
        <span className="home-hero-cta">
            {ctaLabel} <ArrowRight size={18} />
        </span>
    </Link>
);

const Greeting: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
    <div className="home-greeting">
        <h1>{title}</h1>
        <p>{subtitle}</p>
    </div>
);

const Dashboard: React.FC = () => {
    const { hasRole } = useAuth();
    if (hasRole("ADMIN")) return <AdminHome />;
    if (hasRole("SITE_ENGINEER")) return <EngineerHome />;
    if (hasRole("PROCUREMENT")) return <ProcurementHome />;
    if (hasRole("FINANCE")) return <FinanceHome />;
    if (hasRole("FRONT_MAN")) return <FMHome />;
    return (
        <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
            <Package size={48} style={{ marginBottom: "1rem" }} />
            <p>Your home screen is loading…</p>
        </div>
    );
};

// ─── Front Man: primary action = raise a request ──────────────────────────
const FMHome: React.FC = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState<number | null>(null);

    useEffect(() => {
        countRequests("PENDING").then(setOpen);
    }, []);

    return (
        <div className="home-dashboard">
            <Greeting title={`Hello, ${user?.firstName}!`} subtitle="Need materials on site? Raise a request in seconds." />
            <Hero
                color="#f97316"
                icon={<PlusCircle size={30} />}
                headline="Raise a material request"
                sub={open ? `${open} of your requests are awaiting approval.` : "Tell us what you need and where — we'll route it for approval."}
                ctaLabel="New Request"
                ctaPath="/fm/requests/new"
            />
            <SecondaryTiles
                tiles={[
                    { label: "My Requests", icon: <FileText size={26} />, path: "/fm/requests", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
                    { label: "Stock on Site", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Stock History", icon: <History size={26} />, path: "/inventory/history", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
                ]}
            />
        </div>
    );
};

// ─── Site Engineer: primary action = review requests waiting on them ───────
const EngineerHome: React.FC = () => {
    const { user } = useAuth();
    const [waiting, setWaiting] = useState(0);
    const [lowStock, setLowStock] = useState<number | null>(null);

    useEffect(() => {
        countRequests("PENDING").then(setWaiting);
        countLowStock().then(setLowStock);
    }, []);

    return (
        <div className="home-dashboard">
            <Greeting title={`Hello, ${user?.firstName}!`} subtitle="Review your team's material requests and keep site stock healthy." />
            <Hero
                color="#22c55e"
                icon={<CheckSquare size={30} />}
                headline={waiting > 0 ? `${waiting} request${waiting === 1 ? "" : "s"} waiting for your review` : "You're all caught up"}
                sub={waiting > 0 ? "Approve or reject requests from your sites." : "No requests are waiting for approval right now."}
                ctaLabel="Review Requests"
                ctaPath="/engineer/approvals"
            />
            <SecondaryTiles
                tiles={[
                    { label: "Stock on Site", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Low Stock", icon: <AlertTriangle size={26} />, path: "/inventory/alerts", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", count: lowStock },
                    { label: "Stock History", icon: <History size={26} />, path: "/inventory/history", color: "#64748b", bg: "rgba(100,116,139,0.15)" },
                ]}
            />
        </div>
    );
};

// ─── Procurement: primary action = approve engineer-approved requests ──────
const ProcurementHome: React.FC = () => {
    const { user } = useAuth();
    const [waiting, setWaiting] = useState(0);

    useEffect(() => {
        countRequests("ENGINEER_APPROVED").then(setWaiting);
    }, []);

    return (
        <div className="home-dashboard">
            <Greeting title={`Hello, ${user?.firstName}!`} subtitle="Approve requests that have cleared site-engineer review." />
            <Hero
                color="#3b82f6"
                icon={<CheckSquare size={30} />}
                headline={waiting > 0 ? `${waiting} request${waiting === 1 ? "" : "s"} ready for you` : "Nothing waiting on you"}
                sub={waiting > 0 ? "Review and approve requests to move them forward." : "All engineer-approved requests have been handled."}
                ctaLabel="Review Requests"
                ctaPath="/procurement/requests"
            />
            <SecondaryTiles
                tiles={[
                    { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Low Stock", icon: <AlertTriangle size={26} />, path: "/inventory/alerts", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
                ]}
            />
        </div>
    );
};

// ─── Finance: primary action = approve procurement-approved requests ───────
const FinanceHome: React.FC = () => {
    const { user } = useAuth();
    const [waiting, setWaiting] = useState(0);

    useEffect(() => {
        countRequests("PROCUREMENT_APPROVED").then(setWaiting);
    }, []);

    return (
        <div className="home-dashboard">
            <Greeting title={`Hello, ${user?.firstName}!`} subtitle="Give the final approval on requests that have a cost attached." />
            <Hero
                color="#10b981"
                icon={<CheckSquare size={30} />}
                headline={waiting > 0 ? `${waiting} request${waiting === 1 ? "" : "s"} awaiting final approval` : "No approvals pending"}
                sub={waiting > 0 ? "Review the cost and approve or reject." : "Everything sent to finance has been reviewed."}
                ctaLabel="Financial Review"
                ctaPath="/finance/approvals"
            />
            <SecondaryTiles
                tiles={[
                    { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                ]}
            />
        </div>
    );
};

// ─── Admin: overview + jump to whatever needs attention ────────────────────
const AdminHome: React.FC = () => {
    const { user } = useAuth();
    const [pending, setPending] = useState(0);
    const [lowStock, setLowStock] = useState(0);

    useEffect(() => {
        countRequests("PENDING").then(setPending);
        countLowStock().then(setLowStock);
    }, []);

    const heroLow = lowStock > 0;

    return (
        <div className="home-dashboard">
            <Greeting title={`Welcome back, ${user?.firstName}!`} subtitle="Here's what needs attention across your sites." />
            <Hero
                color={heroLow ? "#f59e0b" : "#6366f1"}
                icon={heroLow ? <AlertTriangle size={30} /> : <Package size={30} />}
                headline={heroLow ? `${lowStock} item${lowStock === 1 ? "" : "s"} running low` : "Everything's stocked up"}
                sub={heroLow ? "Check low-stock items and top them up." : `${pending} request${pending === 1 ? "" : "s"} currently pending across all sites.`}
                ctaLabel={heroLow ? "View Low Stock" : "View Stock"}
                ctaPath={heroLow ? "/inventory/alerts" : "/inventory"}
            />
            <SecondaryTiles
                tiles={[
                    { label: "Stock Levels", icon: <Package size={26} />, path: "/inventory", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
                    { label: "Low Stock", icon: <AlertTriangle size={26} />, path: "/inventory/alerts", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", count: lowStock },
                    { label: "Transfer Stock", icon: <ArrowLeftRight size={26} />, path: "/inventory/transfer", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
                    { label: "Adjust Count", icon: <ClipboardCheck size={26} />, path: "/inventory/adjust", color: "#84cc16", bg: "rgba(132,204,22,0.15)" },
                    { label: "Manage Users", icon: <Users size={26} />, path: "/admin/users", color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
                    { label: "Sites", icon: <MapPin size={26} />, path: "/admin/sites", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
                ]}
            />
        </div>
    );
};

export default Dashboard;
