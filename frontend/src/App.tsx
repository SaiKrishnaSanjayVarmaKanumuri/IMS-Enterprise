import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import RequestForm from "./pages/Requests/RequestForm";
import ApprovalList from "./pages/Requests/ApprovalList";
import InventoryList from "./pages/Inventory/InventoryList";
import StockHistory from "./pages/Inventory/StockHistory";
import LowStockAlerts from "./pages/Inventory/LowStockAlerts";
import UserManagement from "./pages/Admin/UserManagement";
import RoleManagement from "./pages/Admin/RoleManagement";
import SiteManagement from "./pages/Admin/SiteManagement";

// Role types matching backend
type UserRole =
    | "ADMIN"
    | "SITE_ENGINEER"
    | "PROCUREMENT"
    | "FINANCE"
    | "FRONT_MAN";

const App: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading IMS...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={
                    !isAuthenticated ? <Login /> : <Navigate to="/" replace />
                }
            />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<InventoryList />} />
                <Route path="inventory/history" element={<StockHistory />} />
                <Route path="inventory/alerts" element={<LowStockAlerts />} />

                {/* Admin Routes - Only accessible by ADMIN */}
                <Route
                    path="admin/users"
                    element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <UserManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/roles"
                    element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <RoleManagement />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="admin/sites"
                    element={
                        <ProtectedRoute allowedRoles={["ADMIN"]}>
                            <SiteManagement />
                        </ProtectedRoute>
                    }
                />

                {/* Site Engineer Routes */}
                <Route
                    path="engineer/approvals"
                    element={
                        <ProtectedRoute allowedRoles={["SITE_ENGINEER"]}>
                            <ApprovalList />
                        </ProtectedRoute>
                    }
                />

                {/* Procurement Routes */}
                <Route
                    path="procurement/requests"
                    element={
                        <ProtectedRoute allowedRoles={["PROCUREMENT"]}>
                            <ApprovalList />
                        </ProtectedRoute>
                    }
                />

                {/* Finance Routes */}
                <Route
                    path="finance/approvals"
                    element={
                        <ProtectedRoute allowedRoles={["FINANCE"]}>
                            <ApprovalList />
                        </ProtectedRoute>
                    }
                />

                {/* Front Man Routes */}
                <Route
                    path="fm/requests/new"
                    element={
                        <ProtectedRoute allowedRoles={["FRONT_MAN"]}>
                            <RequestForm />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="fm/requests"
                    element={
                        <ProtectedRoute allowedRoles={["FRONT_MAN"]}>
                            <ApprovalList />
                        </ProtectedRoute>
                    }
                />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
