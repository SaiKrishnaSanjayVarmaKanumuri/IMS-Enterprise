import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/api";
import {
    InventoryItem,
    InventoryFilter,
    INVENTORY_CATEGORIES,
} from "../../types";
import StockMovementModal from "../../components/StockMovementModal";
import StockHistory from "./StockHistory";
import AddItemModal from "../../components/AddItemModal";

const InventoryList: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<InventoryFilter>({});
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(
        null,
    );
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiClient.inventory.list({
                ...filter,
                page: pagination.page,
                limit: pagination.limit,
            });
            if (response.data.success) {
                const data = response.data.data as {
                    items: InventoryItem[];
                    pagination: typeof pagination;
                };
                setItems(data.items);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch inventory:", error);
        } finally {
            setLoading(false);
        }
    }, [filter, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleFilterChange = (key: keyof InventoryFilter, value: string) => {
        setFilter((prev) => ({ ...prev, [key]: value || undefined }));
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    const getStockStatus = (item: InventoryItem) => {
        if (item.currentStock <= 0) {
            return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
        }
        if (item.minimumStock > 0 && item.currentStock <= item.minimumStock) {
            return {
                label: "Low Stock",
                color: "bg-yellow-100 text-yellow-800",
            };
        }
        if (item.maximumStock && item.currentStock >= item.maximumStock) {
            return { label: "Overstock", color: "bg-blue-100 text-blue-800" };
        }
        return { label: "In Stock", color: "bg-green-100 text-green-800" };
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                        {showHistory ? "View Items" : "View History"}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                        Add Item
                    </button>
                </div>
            </div>

            {showHistory ? (
                <StockHistory onBack={() => setShowHistory(false)} />
            ) : (
                <>
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search by name or code"
                                    value={filter.search || ""}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "search",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Category
                                </label>
                                <select
                                    value={filter.category || ""}
                                    onChange={(e) =>
                                        handleFilterChange(
                                            "category",
                                            e.target.value,
                                        )
                                    }
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                >
                                    <option value="">All Categories</option>
                                    {INVENTORY_CATEGORIES.map((cat) => (
                                        <option
                                            key={cat.value}
                                            value={cat.value}
                                        >
                                            {cat.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Site
                                </label>
                                <input
                                    type="text"
                                    placeholder="Filter by site"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Inventory Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500">
                                    No inventory items found.
                                </p>
                            </div>
                        ) : (
                            <>
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Item
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Category
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Current Stock
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Site
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Updated
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.map((item) => {
                                            const status = getStockStatus(item);
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-gray-50"
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {item.code}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {INVENTORY_CATEGORIES.find(
                                                            (c) =>
                                                                c.value ===
                                                                item.category,
                                                        )?.label ||
                                                            item.category}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {item.currentStock.toLocaleString()}{" "}
                                                        {item.unit}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {item.site?.name || "-"}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(
                                                            item.updatedAt,
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedItem(
                                                                    item,
                                                                );
                                                                setShowMovementModal(
                                                                    true,
                                                                );
                                                            }}
                                                            className="text-primary-600 hover:text-primary-900 mr-3"
                                                        >
                                                            Add/Consume
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingItem(
                                                                    item,
                                                                );
                                                                setShowAddModal(
                                                                    true,
                                                                );
                                                            }}
                                                            className="text-gray-600 hover:text-gray-900"
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Pagination */}
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
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                                <button
                                                    onClick={() =>
                                                        setPagination(
                                                            (prev) => ({
                                                                ...prev,
                                                                page:
                                                                    prev.page -
                                                                    1,
                                                            }),
                                                        )
                                                    }
                                                    disabled={
                                                        pagination.page === 1
                                                    }
                                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setPagination(
                                                            (prev) => ({
                                                                ...prev,
                                                                page:
                                                                    prev.page +
                                                                    1,
                                                            }),
                                                        )
                                                    }
                                                    disabled={
                                                        pagination.page ===
                                                        pagination.totalPages
                                                    }
                                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Stock Movement Modal */}
            {showMovementModal && selectedItem && (
                <StockMovementModal
                    item={selectedItem}
                    onClose={() => {
                        setShowMovementModal(false);
                        setSelectedItem(null);
                    }}
                    onSuccess={() => {
                        setShowMovementModal(false);
                        setSelectedItem(null);
                        fetchInventory();
                    }}
                />
            )}

            {/* Add/Edit Item Modal */}
            {showAddModal && (
                <AddItemModal
                    isOpen={showAddModal}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingItem(null);
                    }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingItem(null);
                        fetchInventory();
                    }}
                    editItem={editingItem}
                />
            )}
        </div>
    );
};

export default InventoryList;
