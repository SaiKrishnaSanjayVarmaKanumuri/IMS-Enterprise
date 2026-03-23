import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ROLE_DISPLAY_NAMES } from "../types";

const Navbar: React.FC = () => {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    const isActive = (path: string) => location.pathname.startsWith(path);

    const navLinks: { path: string; label: string }[] = [];

    // Analytics - accessible to all
    navLinks.push({ path: "/analytics", label: "📊 Analytics" });

    // Inventory links for all authenticated users
    navLinks.push(
        { path: "/inventory", label: "Inventory" },
        { path: "/products", label: "Products" },
        { path: "/inventory/history", label: "History" },
        { path: "/inventory/alerts", label: "Alerts" },
    );

    if (hasRole("ADMIN")) {
        navLinks.push(
            { path: "/vendors", label: "Vendors" },
            { path: "/purchase-orders", label: "Purchase Orders" },
            { path: "/admin/users", label: "Users" },
            { path: "/admin/roles", label: "Roles" },
            { path: "/admin/sites", label: "Sites" },
        );
    }

    if (hasRole("SITE_ENGINEER")) {
        navLinks.push({ path: "/engineer/approvals", label: "Approvals" });
    }

    if (hasRole("PROCUREMENT")) {
        navLinks.push(
            { path: "/vendors", label: "Vendors" },
            { path: "/purchase-orders", label: "Purchase Orders" },
            { path: "/procurement/requests", label: "Approve Requests" },
        );
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
            <div className="max-w-7xl mx-auto px-2 sm:px-4">
                <div className="flex justify-between h-14 sm:h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-lg sm:text-xl font-bold">
                            IMS
                        </Link>
                        <span className="ml-2 text-xs sm:text-sm text-primary-200 hidden sm:inline">
                            Construction Inventory
                        </span>
                    </div>

                    {/* Desktop menu */}
                    {user && (
                        <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
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

                            <div className="flex items-center space-x-1 lg:space-x-2 ml-4">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={`px-2 lg:px-3 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                                            isActive(link.path)
                                                ? "bg-primary-900 text-white"
                                                : "text-primary-100 hover:bg-primary-700"
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>

                            {/* Notifications Bell */}
                            <button className="relative p-2 text-primary-200 hover:text-white transition-colors ml-2">
                                <Bell size={20} />
                                <span className="absolute top-1 right-1 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="bg-primary-700 hover:bg-primary-600 px-3 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ml-2"
                            >
                                Logout
                            </button>
                        </div>
                    )}

                    {/* Mobile menu button */}
                    {user && (
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() =>
                                    setMobileMenuOpen(!mobileMenuOpen)
                                }
                                className="inline-flex items-center justify-center p-2 rounded-md text-primary-100 hover:bg-primary-700 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    {mobileMenuOpen ? (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                    )}
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile menu dropdown */}
                {mobileMenuOpen && user && (
                    <div className="md:hidden pb-3">
                        <div className="px-2 pt-2 pb-3 space-y-1 border-t border-primary-700">
                            <div className="py-2 px-3 text-sm">
                                <span className="block text-primary-200 font-medium">
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
                            {navLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-sm font-medium ${
                                        isActive(link.path)
                                            ? "bg-primary-900 text-white"
                                            : "text-primary-100 hover:bg-primary-700"
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="w-full text-left block px-3 py-2 rounded-md text-sm font-medium bg-primary-700 hover:bg-primary-600 text-white mt-2"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
