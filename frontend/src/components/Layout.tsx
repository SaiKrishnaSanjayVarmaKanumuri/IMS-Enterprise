import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
            <Sidebar />
            {/* Content area — offset by sidebar width on md+ */}
            <main
                className="sidebar-content"
                style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "1.5rem",
                    /* On mobile, add top padding for the fixed mobile bar */
                }}
            >
                <div className="md-sidebar-offset">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
