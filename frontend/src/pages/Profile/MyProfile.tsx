import React from "react";
import { MapPin, Shield, User, Mail, Building2, CheckCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { ROLE_DISPLAY_NAMES } from "../../types";

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "#ef4444",
    SITE_ENGINEER: "#22c55e",
    PROCUREMENT: "#3b82f6",
    FINANCE: "#10b981",
    FRONT_MAN: "#f97316",
};

const MyProfile: React.FC = () => {
    const { user } = useAuth();
    if (!user) return null;

    const roleName =
        ROLE_DISPLAY_NAMES[user.role.name as keyof typeof ROLE_DISPLAY_NAMES] ||
        user.role.name;
    const roleColor = ROLE_COLORS[user.role.name] || "#6366f1";
    const assignedSites: { id: string; name: string; code?: string }[] =
        (user as unknown as { assignedSites?: { id: string; name: string; code?: string }[] })
            .assignedSites || [];

    return (
        <div className="vendors-page">
            <div className="page-header">
                <div>
                    <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <User size={24} /> My Profile
                    </h1>
                    <p>Your account details and site assignments</p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", maxWidth: 900 }}>
                {/* Identity card */}
                <div style={{ background: "var(--ims-surface)", border: "1px solid var(--ims-border)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--ims-border)", background: "rgba(99,102,241,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#a5b4fc", fontWeight: 600 }}>
                            <User size={18} /> Account Details
                        </div>
                    </div>
                    <div style={{ padding: "1.5rem" }}>
                        {/* Avatar */}
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: "50%",
                                background: "linear-gradient(135deg,#6366f1,#4f46e5)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "1.5rem", fontWeight: 800, color: "#fff", flexShrink: 0,
                            }}>
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                                <div style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f1f5f9" }}>
                                    {user.firstName} {user.lastName}
                                </div>
                                <div style={{
                                    display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4,
                                    padding: "2px 10px", borderRadius: 20,
                                    background: `${roleColor}22`, color: roleColor,
                                    fontSize: "0.75rem", fontWeight: 600,
                                }}>
                                    <Shield size={11} /> {roleName}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <Mail size={16} color="#64748b" />
                                <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>{user.email}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <Shield size={16} color="#64748b" />
                                <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Role: <span style={{ color: roleColor, fontWeight: 600 }}>{roleName}</span></span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <MapPin size={16} color="#64748b" />
                                <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                                    {assignedSites.length} site{assignedSites.length !== 1 ? "s" : ""} assigned
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assigned Sites card */}
                <div style={{ background: "var(--ims-surface)", border: "1px solid var(--ims-border)", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--ims-border)", background: "rgba(16,185,129,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#6ee7b7", fontWeight: 600 }}>
                            <MapPin size={18} /> 📍 My Assigned Sites
                        </div>
                    </div>
                    <div style={{ padding: "1rem 1.25rem" }}>
                        {assignedSites.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#475569" }}>
                                <Building2 size={32} style={{ margin: "0 auto 0.75rem" }} />
                                <div style={{ fontWeight: 500 }}>No sites assigned yet</div>
                                <div style={{ fontSize: "0.8125rem", marginTop: 4 }}>Contact your Admin to get assigned to a site</div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                {assignedSites.map((site) => (
                                    <div key={site.id} style={{
                                        display: "flex", alignItems: "center", gap: "0.75rem",
                                        padding: "0.75rem 1rem",
                                        background: "rgba(16,185,129,0.06)",
                                        border: "1px solid rgba(16,185,129,0.15)",
                                        borderRadius: 10,
                                    }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                                            background: "rgba(16,185,129,0.15)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                        }}>
                                            <MapPin size={18} color="#10b981" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.875rem" }}>{site.name}</div>
                                            {site.code && <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{site.code}</div>}
                                        </div>
                                        <CheckCircle size={16} color="#10b981" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Permissions card */}
                <div style={{ background: "var(--ims-surface)", border: "1px solid var(--ims-border)", borderRadius: 16, overflow: "hidden", gridColumn: "1 / -1" }}>
                    <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--ims-border)", background: "rgba(245,158,11,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#fcd34d", fontWeight: 600 }}>
                            <Shield size={18} /> 🔑 My Permissions
                        </div>
                    </div>
                    <div style={{ padding: "1.25rem 1.5rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {(user.role.permissions || []).map((perm) => (
                                <span
                                    key={typeof perm === "string" ? perm : (perm as { name: string }).name}
                                    style={{
                                        padding: "4px 12px", borderRadius: 20,
                                        background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                                        color: "#a5b4fc", fontSize: "0.75rem", fontWeight: 500,
                                        fontFamily: "monospace",
                                    }}
                                >
                                    {typeof perm === "string" ? perm : (perm as { name: string }).name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
