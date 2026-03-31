import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Home, BarChart2, Package, Layers, History, AlertTriangle,
    PlusCircle, FileText, CheckSquare, Building2, ShoppingCart,
    DollarSign, Users, Shield, MapPin, LogOut, Bell, Menu, X,
    ChevronRight, ArrowLeftRight, ClipboardCheck, Search, UserCircle
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_DISPLAY_NAMES } from "../types";

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    color?: string;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const Sidebar: React.FC = () => {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const isActive = (path: string) =>
        path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

    const groups: NavGroup[] = [];

    // ── Main ───────────────────────────────
    const mainItems: NavItem[] = [
        { path: "/", label: "Home", icon: <Home size={20} />, color: "#6366f1" },
        { path: "/analytics", label: "Analytics", icon: <BarChart2 size={20} />, color: "#22d3ee" },
        { path: "/profile", label: "My Profile & Sites", icon: <UserCircle size={20} />, color: "#f472b6" },
    ];
    groups.push({ title: "Main", items: mainItems });

    // ── Inventory ──────────────────────────
    const inventoryItems: NavItem[] = [
        { path: "/inventory", label: "Stock Levels", icon: <Package size={20} />, color: "#10b981" },
        { path: "/products", label: "Product Catalog", icon: <Layers size={20} />, color: "#8b5cf6" },
        { path: "/inventory/history", label: "Stock History", icon: <History size={20} />, color: "#64748b" },
        { path: "/inventory/alerts", label: "Low Stock Alerts", icon: <AlertTriangle size={20} />, color: "#f59e0b" },
        { path: "/inventory/transfer", label: "Transfer Stock", icon: <ArrowLeftRight size={20} />, color: "#06b6d4" },
        { path: "/inventory/adjust", label: "Adjust Count", icon: <ClipboardCheck size={20} />, color: "#84cc16" },
    ];
    groups.push({ title: "Inventory", items: inventoryItems });

    // ── Role-based sections ────────────────
    if (hasRole("FRONT_MAN")) {
        groups.push({
            title: "Requests",
            items: [
                { path: "/fm/requests/new", label: "New Request", icon: <PlusCircle size={20} />, color: "#f97316" },
                { path: "/fm/requests", label: "My Requests", icon: <FileText size={20} />, color: "#6366f1" },
            ],
        });
    }

    if (hasRole("SITE_ENGINEER")) {
        groups.push({
            title: "Approvals",
            items: [
                { path: "/engineer/approvals", label: "Review Requests", icon: <CheckSquare size={20} />, color: "#22c55e" },
            ],
        });
    }

    if (hasRole("PROCUREMENT") || hasRole("ADMIN")) {
        groups.push({
            title: "Procurement",
            items: [
                { path: "/vendors", label: "Vendors", icon: <Building2 size={20} />, color: "#a855f7" },
                { path: "/purchase-orders", label: "Purchase Orders", icon: <ShoppingCart size={20} />, color: "#3b82f6" },
                ...(hasRole("PROCUREMENT")
                    ? [{ path: "/procurement/requests", label: "Approve Requests", icon: <CheckSquare size={20} />, color: "#22c55e" }]
                    : []),
            ],
        });
    }

    if (hasRole("FINANCE")) {
        groups.push({
            title: "Finance",
            items: [
                { path: "/finance/approvals", label: "Financial Review", icon: <DollarSign size={20} />, color: "#10b981" },
            ],
        });
    }

    if (hasRole("ADMIN")) {
        groups.push({
            title: "Administration",
            items: [
                { path: "/admin/users", label: "Manage Users", icon: <Users size={20} />, color: "#6366f1" },
                { path: "/admin/roles", label: "Roles & Permissions", icon: <Shield size={20} />, color: "#f43f5e" },
                { path: "/admin/sites", label: "Sites", icon: <MapPin size={20} />, color: "#f97316" },
            ],
        });
    }

    const userInitials = user ? `${user.firstName[0]}${user.lastName[0]}` : "?";
    const roleName = user ? ROLE_DISPLAY_NAMES[user.role.name as keyof typeof ROLE_DISPLAY_NAMES] || user.role.name : "";

    const NavLinkItem = ({ item }: { item: NavItem }) => {
        const active = isActive(item.path);
        return (
            <Link
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: collapsed ? 0 : "0.75rem",
                    padding: collapsed ? "0.625rem" : "0.625rem 0.875rem",
                    borderRadius: "10px",
                    textDecoration: "none",
                    transition: "all 0.15s",
                    background: active ? `${item.color}22` : "transparent",
                    color: active ? item.color : "#94a3b8",
                    fontWeight: active ? 600 : 400,
                    fontSize: "0.8375rem",
                    justifyContent: collapsed ? "center" : "flex-start",
                    position: "relative",
                    marginBottom: "2px",
                }}
                onMouseEnter={(e) => {
                    if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
                    }
                }}
                onMouseLeave={(e) => {
                    if (!active) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                    }
                }}
            >
                {/* Active indicator */}
                {active && (
                    <span style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 3,
                        height: "60%",
                        background: item.color,
                        borderRadius: "0 3px 3px 0",
                    }} />
                )}
                <span style={{ color: active ? item.color : "inherit", flexShrink: 0, display: "flex" }}>
                    {item.icon}
                </span>
                {!collapsed && (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                    </span>
                )}
                {!collapsed && item.badge ? (
                    <span style={{
                        marginLeft: "auto",
                        background: "#ef4444",
                        color: "#fff",
                        borderRadius: "999px",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        minWidth: 18,
                        textAlign: "center",
                    }}>{item.badge}</span>
                ) : null}
            </Link>
        );
    };

    const sidebarContent = (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
        }}>
            {/* Logo */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                padding: "1.125rem 1rem",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
            }}>
                {!collapsed && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <div style={{
                            width: 32, height: 32,
                            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                            borderRadius: 8,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 800, fontSize: "0.875rem", color: "#fff",
                        }}>IMS</div>
                        <div>
                            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.2 }}>Enterprise</div>
                            <div style={{ fontSize: "0.6875rem", color: "#64748b", lineHeight: 1 }}>Inventory System</div>
                        </div>
                    </div>
                )}
                {collapsed && (
                    <div style={{
                        width: 32, height: 32,
                        background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                        borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: "0.875rem", color: "#fff",
                    }}>IMS</div>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 6,
                        padding: "0.25rem",
                        color: "#64748b",
                        cursor: "pointer",
                        display: "flex",
                        flexShrink: 0,
                        marginLeft: collapsed ? 0 : "auto",
                        marginTop: collapsed ? "0.5rem" : 0,
                    }}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
                </button>
            </div>

            {/* Search */}
            {!collapsed && (
                <div style={{ padding: "0.75rem 0.875rem", flexShrink: 0 }}>
                    <div style={{ position: "relative" }}>
                        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569" }} />
                        <input
                            type="text"
                            placeholder="Search..."
                            style={{
                                width: "100%",
                                padding: "0.4375rem 0.75rem 0.4375rem 2rem",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 8,
                                color: "#94a3b8",
                                fontSize: "0.8125rem",
                                boxSizing: "border-box" as const,
                            }}
                            onFocus={(e) => { e.target.style.borderColor = "#6366f1"; e.target.style.outline = "none"; }}
                            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
                        />
                    </div>
                </div>
            )}

            {/* Nav groups */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "0.25rem 0.75rem", overflowX: "hidden" }}>
                {groups.map((group) => (
                    <div key={group.title} style={{ marginBottom: "1rem" }}>
                        {!collapsed && (
                            <div style={{
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                color: "#475569",
                                textTransform: "uppercase",
                                letterSpacing: "0.07em",
                                padding: "0.375rem 0.875rem",
                                marginBottom: "0.25rem",
                            }}>
                                {group.title}
                            </div>
                        )}
                        {group.items.map((item) => (
                            <NavLinkItem key={item.path} item={item} />
                        ))}
                    </div>
                ))}
            </nav>

            {/* User profile + logout */}
            <div style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                padding: "0.875rem 0.75rem",
                flexShrink: 0,
            }}>
                {!collapsed ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.625rem" }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: "0.8125rem", color: "#fff", flexShrink: 0,
                        }}>{userInitials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.8375rem", fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {user?.firstName} {user?.lastName}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>{roleName}</div>
                        </div>
                        <button title="Notifications" style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4, position: "relative" }}>
                            <Bell size={18} />
                            <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, background: "#ef4444", borderRadius: "50%" }} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: "0.75rem", color: "#fff",
                        }}>{userInitials}</div>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    title="Logout"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "flex-start",
                        gap: "0.5rem",
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.15)",
                        borderRadius: 8,
                        color: "#f87171",
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.18)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
                >
                    <LogOut size={16} />
                    {!collapsed && "Sign Out"}
                </button>
            </div>
        </div>
    );

    const sidebarWidth = collapsed ? 64 : 240;

    return (
        <>
            {/* Desktop Sidebar */}
            <aside style={{
                width: sidebarWidth,
                height: "100vh",
                background: "#0f172a",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                position: "sticky",
                top: 0,
                flexShrink: 0,
                transition: "width 0.25s ease",
                zIndex: 100,
                overflowX: "hidden",
                overflowY: "auto",
            }} className="hidden md:flex">
                {sidebarContent}
            </aside>

            {/* Mobile top bar */}
            <div className="md:hidden" style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: 56,
                background: "#0f172a",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 1rem",
                zIndex: 200,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div style={{
                        width: 28, height: 28,
                        background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                        borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: "0.75rem", color: "#fff",
                    }}>IMS</div>
                    <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#f1f5f9" }}>Enterprise</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button style={{ background: "none", border: "none", color: "#64748b", padding: 6, cursor: "pointer", position: "relative" }}>
                        <Bell size={20} />
                        <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, background: "#ef4444", borderRadius: "50%" }} />
                    </button>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        style={{ background: "none", border: "none", color: "#94a3b8", padding: 6, cursor: "pointer" }}
                    >
                        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <>
                    <div
                        onClick={() => setMobileOpen(false)}
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 250 }}
                    />
                    <aside style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: 280,
                        background: "#0f172a",
                        zIndex: 300,
                        display: "flex",
                        flexDirection: "column",
                        overflowX: "hidden",
                    }}>
                        {sidebarContent}
                    </aside>
                </>
            )}
        </>
    );
};

export default Sidebar;
