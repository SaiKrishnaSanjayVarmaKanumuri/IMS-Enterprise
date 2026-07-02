import React, { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { apiClient } from "../services/api";

interface Notif {
    id: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

/**
 * Notifications bell + dropdown panel. `direction` controls whether the panel
 * opens downward (mobile top bar) or upward (desktop sidebar footer).
 */
const NotificationsBell: React.FC<{ direction?: "up" | "down" }> = ({ direction = "down" }) => {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Notif[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    // The panel is position:fixed (so it escapes the sidebar's overflow clip);
    // anchor it to the bell so it lines up in either placement.
    const computeCoords = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (!r) return;
        if (direction === "down") {
            // Mobile top bar: bell is top-right → right-align the panel below it.
            setCoords({ top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) });
        } else {
            // Desktop sidebar footer: bell is bottom-left → left-align above it,
            // clamped so a 320px panel never runs off the right edge.
            const left = Math.min(r.left, window.innerWidth - 320 - 12);
            setCoords({ bottom: window.innerHeight - r.top + 8, left: Math.max(12, left) });
        }
    };

    const load = async () => {
        setLoading(true);
        try {
            const r = await apiClient.notifications.list({ limit: 15 });
            const d = r.data.data as { notifications: Notif[]; unreadCount: number };
            setItems(d.notifications || []);
            setUnread(d.unreadCount || 0);
        } catch {
            // Silent — panel just shows the empty state.
        } finally {
            setLoading(false);
        }
    };

    // Prime the unread badge on mount.
    useEffect(() => {
        load();
    }, []);

    // Close on outside click.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const toggle = () => {
        const next = !open;
        if (next) {
            computeCoords();
            load();
        }
        setOpen(next);
    };

    const markAll = async () => {
        try {
            await apiClient.notifications.markAllRead();
            setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnread(0);
        } catch {
            // ignore
        }
    };

    return (
        <div ref={ref} className="notif-wrap">
            <button ref={btnRef} className="notif-bell" onClick={toggle} title="Notifications" aria-label="Notifications">
                <Bell size={direction === "down" ? 20 : 18} />
                {unread > 0 && <span className="notif-dot">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <div className="notif-panel" style={coords}>
                    <div className="notif-head">
                        <span>Notifications</span>
                        {items.some((n) => !n.isRead) && (
                            <button onClick={markAll}>
                                <Check size={13} /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="notif-body">
                        {loading ? (
                            <div className="notif-empty" style={{ fontSize: "0.875rem" }}>
                                Loading…
                            </div>
                        ) : items.length === 0 ? (
                            <div className="notif-empty">
                                🔔
                                <p>You're all caught up</p>
                                <span>No notifications yet</span>
                            </div>
                        ) : (
                            items.map((n) => (
                                <div key={n.id} className={`notif-item ${n.isRead ? "" : "unread"}`}>
                                    <div className="notif-item-title">{n.title}</div>
                                    <div className="notif-item-msg">{n.message}</div>
                                    <div className="notif-item-time">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsBell;
