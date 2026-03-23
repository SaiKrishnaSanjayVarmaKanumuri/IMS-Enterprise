import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <main className="max-w-7xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
