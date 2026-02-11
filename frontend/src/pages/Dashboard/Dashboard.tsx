import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../services/api";
import {
    ROLE_DISPLAY_NAMES,
    STATUS_COLORS,
    STATUS_DISPLAY_NAMES,
} from "../../types";

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const [stats, setStats] = useState({
        totalRequests: 0,
        pendingApprovals: 0,
        myRequests: 0,
        completedThisMonth: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await apiClient.requests.list({ limit: 1 });
                if (response.data.success) {
                    setStats({
                        totalRequests: (
                            response.data.data as {
                                pagination: { total: number };
                            }
                        ).pagination.total,
                        pendingApprovals: 0,
                        myRequests: 0,
                        completedThisMonth: 0,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [hasRole]);

    if (hasRole("ADMIN")) {
        return <AdminDashboard />;
    }

    if (hasRole("SITE_ENGINEER")) {
        return <EngineerDashboard />;
    }

    if (hasRole("PROCUREMENT")) {
        return <ProcurementDashboard />;
    }

    if (hasRole("FINANCE")) {
        return <FinanceDashboard />;
    }

    if (hasRole("FRONT_MAN")) {
        return <FMDashboard />;
    }

    return (
        <div className="text-center py-12">
            <h2 className="text-xl text-gray-600">Welcome to IMS</h2>
            <p className="mt-2 text-gray-500">
                Your role dashboard will appear here.
            </p>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">
                        Total Users
                    </h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">
                        Active Sites
                    </h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">
                        Pending Requests
                    </h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">
                        Total Requests
                    </h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => navigate("/admin/users")}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="text-lg font-semibold text-gray-900">
                        Manage Users
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Create and manage user accounts
                    </p>
                </button>
                <button
                    onClick={() => navigate("/admin/roles")}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="text-lg font-semibold text-gray-900">
                        Manage Roles
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Configure roles and permissions
                    </p>
                </button>
                <button
                    onClick={() => navigate("/admin/sites")}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="text-lg font-semibold text-gray-900">
                        Manage Sites
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Add and configure construction sites
                    </p>
                </button>
            </div>
        </div>
    );
};

const EngineerDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                Site Engineer Dashboard
            </h1>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Pending Approvals
                </h2>
                <p className="text-gray-500">
                    No requests pending your approval.
                </p>
                <button
                    onClick={() => navigate("/engineer/approvals")}
                    className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    View All Approvals
                </button>
            </div>
        </div>
    );
};

const ProcurementDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                Procurement Dashboard
            </h1>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Engineer-Approved Requests
                </h2>
                <p className="text-gray-500">
                    No requests ready for procurement processing.
                </p>
                <button
                    onClick={() => navigate("/procurement/requests")}
                    className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    View All Requests
                </button>
            </div>
        </div>
    );
};

const FinanceDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                Finance Dashboard
            </h1>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Pending Financial Review
                </h2>
                <p className="text-gray-500">
                    No requests pending financial approval.
                </p>
                <button
                    onClick={() => navigate("/finance/approvals")}
                    className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    View All Reviews
                </button>
            </div>
        </div>
    );
};

const FMDashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                Front Man Dashboard
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => navigate("/fm/requests/new")}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="text-lg font-semibold text-gray-900">
                        New Material Request
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Create a new material request for your site
                    </p>
                </button>
                <button
                    onClick={() => navigate("/fm/requests")}
                    className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left"
                >
                    <h3 className="text-lg font-semibold text-gray-900">
                        My Requests
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        View and track your submitted requests
                    </p>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Recent Requests
                </h2>
                <p className="text-gray-500">No recent requests.</p>
            </div>
        </div>
    );
};

export default Dashboard;
