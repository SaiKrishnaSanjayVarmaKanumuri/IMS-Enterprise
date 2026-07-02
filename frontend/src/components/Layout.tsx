import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

const Layout: React.FC = () => {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        /* App shell: full-height sidebar on the left, top bar + content on the right */
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--ims-bg)" }}>
            <Sidebar mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <TopBar onMenu={() => setMobileNavOpen(true)} />
                <main style={{ flex: 1, minWidth: 0, padding: "1.75rem 2rem" }} className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
