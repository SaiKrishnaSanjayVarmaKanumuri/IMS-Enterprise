import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import RequestForm from "./pages/Requests/RequestForm";
import RequestDetail from "./pages/Requests/RequestDetail";
import ApprovalList from "./pages/Requests/ApprovalList";
import InventoryList from "./pages/Inventory/InventoryList";
import StockHistory from "./pages/Inventory/StockHistory";
import LowStockAlerts from "./pages/Inventory/LowStockAlerts";
import UserManagement from "./pages/Admin/UserManagement";
import RoleManagement from "./pages/Admin/RoleManagement";
import SiteManagement from "./pages/Admin/SiteManagement";
import AnalyticsDashboard from "./pages/Analytics/AnalyticsDashboard";
import VendorsPage from "./pages/Procurement/VendorsPage";
import PurchaseOrdersPage from "./pages/Procurement/PurchaseOrdersPage";
import ProductsPage from "./pages/Inventory/ProductsPage";
import StockTransfer from "./pages/Inventory/StockTransfer";
import InventoryAdjust from "./pages/Inventory/InventoryAdjust";
import MyProfile from "./pages/Profile/MyProfile";

const App: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                    <p style={{ marginTop: 16, color: "#94a3b8", fontSize: 14 }}>Loading IMS Enterprise...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="inventory" element={<InventoryList />} />
                <Route path="inventory/history" element={<StockHistory />} />
                <Route path="inventory/alerts" element={<LowStockAlerts />} />
                <Route path="inventory/transfer" element={<StockTransfer />} />
                <Route path="inventory/adjust" element={<InventoryAdjust />} />
                <Route path="profile" element={<MyProfile />} />
                <Route path="products" element={<ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT", "FRONT_MAN", "SITE_ENGINEER"]}><ProductsPage /></ProtectedRoute>} />
                <Route path="vendors" element={<ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT"]}><VendorsPage /></ProtectedRoute>} />
                <Route path="purchase-orders" element={<ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT"]}><PurchaseOrdersPage /></ProtectedRoute>} />
                <Route path="admin/users" element={<ProtectedRoute allowedRoles={["ADMIN"]}><UserManagement /></ProtectedRoute>} />
                <Route path="admin/roles" element={<ProtectedRoute allowedRoles={["ADMIN"]}><RoleManagement /></ProtectedRoute>} />
                <Route path="admin/sites" element={<ProtectedRoute allowedRoles={["ADMIN"]}><SiteManagement /></ProtectedRoute>} />
                <Route path="engineer/approvals" element={<ProtectedRoute allowedRoles={["SITE_ENGINEER"]}><ApprovalList /></ProtectedRoute>} />
                <Route path="procurement/requests" element={<ProtectedRoute allowedRoles={["PROCUREMENT"]}><ApprovalList /></ProtectedRoute>} />
                <Route path="finance/approvals" element={<ProtectedRoute allowedRoles={["FINANCE"]}><ApprovalList /></ProtectedRoute>} />
                <Route path="fm/requests/new" element={<ProtectedRoute allowedRoles={["FRONT_MAN"]}><RequestForm /></ProtectedRoute>} />
                <Route path="fm/requests" element={<ProtectedRoute allowedRoles={["FRONT_MAN"]}><ApprovalList /></ProtectedRoute>} />
                <Route path="requests/:id" element={<ProtectedRoute><RequestDetail /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
