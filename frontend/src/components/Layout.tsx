import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

const Layout: React.FC = () => {
    return (
        /* Outer flex container — sidebar + content side by side */
        <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9" }}>
            <Sidebar />
            {/* Main content — automatically fills space beside the sticky sidebar */}
            <main style={{
                flex: 1,
                minWidth: 0,
                padding: "1.75rem 2rem",
                /* Mobile: add top padding for the fixed 56px mobile top bar */
                paddingTop: "1.75rem",
            }} className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
