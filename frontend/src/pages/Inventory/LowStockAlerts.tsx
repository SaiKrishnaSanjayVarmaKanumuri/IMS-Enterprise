import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api";
import { Alert, InventoryItem } from "../../types";

const LowStockAlerts: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ severity: "", showRead: false });

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const response = await apiClient.inventory.getLowStockAlerts({
                ...filter,
                isRead: filter.showRead ? undefined : false,
            });
            if (response.data.success) {
                const data = response.data.data as {
                    alerts: Alert[];
                    lowStockItems: InventoryItem[];
                    unreadCount: number;
                };
                setAlerts(data.alerts);
                setLowStockItems(data.lowStockItems);
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, [filter]);

    const markAsRead = async (alertId: string) => {
        try {
            await apiClient.inventory.markAlertRead(alertId);
            fetchAlerts();
        } catch (error) {
            console.error("Failed to mark alert as read:", error);
        }
    };

    const markAllAsRead = async () => {
        for (const alert of alerts) {
            if (!alert.isRead) {
                await markAsRead(alert.id);
            }
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case "critical":
                return (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Critical
                    </span>
                );
            case "warning":
                return (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Warning
                    </span>
                );
            default:
                return (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Info
                    </span>
                );
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    Low Stock Alerts
                </h1>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                        Mark All as Read ({unreadCount})
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="flex space-x-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Severity
                        </label>
                        <select
                            value={filter.severity}
                            onChange={(e) =>
                                setFilter((prev) => ({
                                    ...prev,
                                    severity: e.target.value,
                                }))
                            }
                            className="mt-1 block w-40 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">All</option>
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={filter.showRead}
                                onChange={(e) =>
                                    setFilter((prev) => ({
                                        ...prev,
                                        showRead: e.target.checked,
                                    }))
                                }
                                className="mr-2"
                            />
                            <span className="text-sm text-gray-700">
                                Show read alerts
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Alerts List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">No low stock alerts.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {alerts.map((alert) => (
                            <li
                                key={alert.id}
                                className={`p-4 hover:bg-gray-50 ${
                                    !alert.isRead ? "bg-blue-50" : ""
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            {getSeverityBadge(alert.severity)}
                                            {!alert.isRead && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm text-gray-900">
                                            {alert.message}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {formatDate(alert.createdAt)}
                                        </p>
                                        {alert.inventoryItem?.site && (
                                            <p className="mt-1 text-sm text-gray-600">
                                                Site:{" "}
                                                {alert.inventoryItem.site.name}
                                            </p>
                                        )}
                                    </div>
                                    {!alert.isRead && (
                                        <button
                                            onClick={() => markAsRead(alert.id)}
                                            className="ml-4 text-sm text-primary-600 hover:text-primary-900"
                                        >
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Low Stock Items Summary */}
            {lowStockItems.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                            Items Below Minimum Stock ({lowStockItems.length})
                        </h3>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Item
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Current Stock
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Minimum
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Site
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {lowStockItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {item.code}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                        {item.currentStock.toLocaleString()}{" "}
                                        {item.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.minimumStock.toLocaleString()}{" "}
                                        {item.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.site?.name || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default LowStockAlerts;
