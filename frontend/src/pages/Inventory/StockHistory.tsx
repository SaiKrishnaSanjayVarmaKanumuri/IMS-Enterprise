import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api";
import { StockMovement } from "../../types";

interface StockHistoryProps {
    onBack?: () => void;
    inventoryItemId?: string;
}

const StockHistory: React.FC<StockHistoryProps> = ({
    onBack,
    inventoryItemId,
}) => {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: "",
        siteId: "",
        startDate: "",
        endDate: "",
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
    });

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await apiClient.inventory.getHistory({
                ...filters,
                inventoryItemId,
                page: pagination.page,
                limit: pagination.limit,
            });
            if (response.data.success) {
                const data = response.data.data as {
                    movements: StockMovement[];
                    pagination: typeof pagination;
                };
                setMovements(data.movements);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch stock history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [filters, pagination.page, inventoryItemId]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getMovementBadge = (type: string) => {
        if (type === "ADD") {
            return (
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    ADD
                </span>
            );
        }
        return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                CONSUME
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {onBack && (
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="mr-4 text-gray-600 hover:text-gray-900"
                    >
                        ← Back
                    </button>
                </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900">
                {inventoryItemId ? "Item History" : "Stock Movement History"}
            </h1>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Type
                        </label>
                        <select
                            value={filters.type}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    type: e.target.value,
                                }))
                            }
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="ADD">Add</option>
                            <option value="CONSUME">Consume</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    startDate: e.target.value,
                                }))
                            }
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    endDate: e.target.value,
                                }))
                            }
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">
                            No stock movements found.
                        </p>
                    </div>
                ) : (
                    <>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Date/Time
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Item
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Quantity
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Before → After
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Performed By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Site
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Reason
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {movements.map((movement) => (
                                    <tr
                                        key={movement.id}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(movement.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {movement.inventoryItem?.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {movement.inventoryItem?.code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getMovementBadge(movement.type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {movement.type === "ADD"
                                                ? "+"
                                                : "-"}
                                            {movement.quantity.toLocaleString()}{" "}
                                            {movement.inventoryItem?.unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {movement.previousStock.toLocaleString()}{" "}
                                            →{" "}
                                            {movement.newStock.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {
                                                    movement.performedBy
                                                        ?.firstName
                                                }{" "}
                                                {movement.performedBy?.lastName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {movement.performedBy?.role}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {movement.site?.name || "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {movement.reason || "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() =>
                                            setPagination((prev) => ({
                                                ...prev,
                                                page: prev.page - 1,
                                            }))
                                        }
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() =>
                                            setPagination((prev) => ({
                                                ...prev,
                                                page: prev.page + 1,
                                            }))
                                        }
                                        disabled={
                                            pagination.page ===
                                            pagination.totalPages
                                        }
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Page{" "}
                                            <span className="font-medium">
                                                {pagination.page}
                                            </span>{" "}
                                            of{" "}
                                            <span className="font-medium">
                                                {pagination.totalPages}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default StockHistory;
