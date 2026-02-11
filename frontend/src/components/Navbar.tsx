import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_DISPLAY_NAMES } from "../types";

const Navbar: React.FC = () => {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    const navLinks: { path: string; label: string }[] = [];

    // Inventory links for all authenticated users
    navLinks.push(
        { path: "/inventory", label: "Inventory" },
        { path: "/inventory/history", label: "History" },
        { path: "/inventory/alerts", label: "Alerts" },
    );

    if (hasRole("ADMIN")) {
        navLinks.push(
            { path: "/admin/users", label: "Users" },
            { path: "/admin/roles", label: "Roles" },
            { path: "/admin/sites", label: "Sites" },
        );
    }

    if (hasRole("SITE_ENGINEER")) {
        navLinks.push({ path: "/engineer/approvals", label: "Approvals" });
    }

    if (hasRole("PROCUREMENT")) {
        navLinks.push({
            path: "/procurement/requests",
            label: "Purchase Orders",
        });
    }

    if (hasRole("FINANCE")) {
        navLinks.push({
            path: "/finance/approvals",
            label: "Financial Review",
        });
    }

    if (hasRole("FRONT_MAN")) {
        navLinks.push(
            { path: "/fm/requests/new", label: "New Request" },
            { path: "/fm/requests", label: "My Requests" },
        );
    }

    return (
        <nav className="bg-primary-800 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-xl font-bold">
                            IMS
                        </Link>
                        <span className="ml-2 text-sm text-primary-200">
                            Construction Inventory
                        </span>
                    </div>

                    {user && (
                        <div className="flex items-center space-x-4">
                            <div className="text-sm">
                                <span className="block text-primary-200">
                                    {user.firstName} {user.lastName}
                                </span>
                                <span className="text-xs text-primary-300">
                                    {
                                        ROLE_DISPLAY_NAMES[
                                            user.role
                                                .name as keyof typeof ROLE_DISPLAY_NAMES
                                        ]
                                    }
                                </span>
                            </div>

                            <div className="hidden md:flex items-center space-x-4 ml-6">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                            isActive(link.path)
                                                ? "bg-primary-900 text-white"
                                                : "text-primary-100 hover:bg-primary-700"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>

                            <button
                                onClick={handleLogout}
                                className="bg-primary-700 hover:bg-primary-600 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
