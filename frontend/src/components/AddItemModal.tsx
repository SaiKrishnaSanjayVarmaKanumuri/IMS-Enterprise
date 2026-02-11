import React, { useState, useEffect } from "react";
import { apiClient } from "../services/api";
import {
    InventoryItem,
    INVENTORY_CATEGORIES,
    Site,
    CreateInventoryForm,
} from "../types";

interface AddItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editItem?: InventoryItem | null;
}

const AddItemModal: React.FC<AddItemModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    editItem,
}) => {
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateInventoryForm>({
        name: "",
        code: "",
        category: "raw_materials",
        unit: "pieces",
        siteId: "",
        minimumStock: 0,
        maximumStock: undefined,
        description: "",
        specifications: "",
        location: "",
    });

    useEffect(() => {
        if (isOpen) {
            fetchSites();
            if (editItem) {
                setFormData({
                    name: editItem.name,
                    code: editItem.code,
                    category: editItem.category,
                    unit: editItem.unit,
                    siteId: editItem.siteId,
                    minimumStock: editItem.minimumStock,
                    maximumStock: editItem.maximumStock || undefined,
                    description: editItem.description || "",
                    specifications: editItem.specifications || "",
                    location: editItem.location || "",
                });
            } else {
                resetForm();
            }
        }
    }, [isOpen, editItem]);

    const fetchSites = async () => {
        try {
            const response = await apiClient.sites.list({ status: "active" });
            if (response.data.success) {
                const data = response.data.data as { sites: Site[] };
                setSites(data.sites);
                // Set default site if only one
                if (data.sites.length === 1 && !formData.siteId) {
                    setFormData((prev) => ({
                        ...prev,
                        siteId: data.sites[0].id,
                    }));
                }
            }
        } catch (error: unknown) {
            console.error("Failed to fetch sites:", error);
            const axiosError = error as {
                response?: { status?: number; data?: { error?: string } };
            };
            if (axiosError.response?.status === 403) {
                setError(
                    "You don't have permission to view sites. Please contact admin to add 'sites:read' permission to your role.",
                );
            } else {
                setError("Failed to load sites");
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            code: "",
            category: "raw_materials",
            unit: "pieces",
            siteId: sites.length > 0 ? sites[0].id : "",
            minimumStock: 0,
            maximumStock: undefined,
            description: "",
            specifications: "",
            location: "",
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (editItem) {
                await apiClient.inventory.update(editItem.id, {
                    name: formData.name,
                    minimumStock: formData.minimumStock,
                    maximumStock: formData.maximumStock,
                    description: formData.description,
                    specifications: formData.specifications,
                    location: formData.location,
                });
            } else {
                await apiClient.inventory.create(formData);
            }
            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error("Failed to save item:", error);
            const axiosError = error as {
                response?: { data?: { error?: string; message?: string } };
            };
            setError(
                axiosError.response?.data?.error ||
                    axiosError.response?.data?.message ||
                    "Failed to save item",
            );
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {editItem
                            ? "Edit Inventory Item"
                            : "Add New Inventory Item"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                required
                                placeholder="e.g., Cement, Steel Rods"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Code *
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        code: e.target.value.toUpperCase(),
                                    })
                                }
                                required
                                minLength={2}
                                maxLength={20}
                                placeholder="e.g., CEM-001"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Site */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site *
                            </label>
                            <select
                                value={formData.siteId}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        siteId: e.target.value,
                                    })
                                }
                                required
                                disabled={editItem !== undefined}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">Select Site</option>
                                {sites.map((site) => (
                                    <option key={site.id} value={site.id}>
                                        {site.name} ({site.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        category: e.target.value,
                                    })
                                }
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            >
                                {INVENTORY_CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit *
                            </label>
                            <select
                                value={formData.unit}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        unit: e.target.value,
                                    })
                                }
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="pieces">Pieces</option>
                                <option value="kg">Kilograms (kg)</option>
                                <option value="tons">Tons</option>
                                <option value="liters">Liters</option>
                                <option value="meters">Meters</option>
                                <option value="sqm">Square Meters (sqm)</option>
                                <option value="cubic">Cubic Meters</option>
                                <option value="boxes">Boxes</option>
                                <option value="bags">Bags</option>
                                <option value="sets">Sets</option>
                                <option value="units">Units</option>
                            </select>
                        </div>

                        {/* Minimum Stock */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Minimum Stock *
                            </label>
                            <input
                                type="number"
                                value={formData.minimumStock}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        minimumStock:
                                            parseFloat(e.target.value) || 0,
                                    })
                                }
                                required
                                min={0}
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Maximum Stock */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Maximum Stock (Optional)
                            </label>
                            <input
                                type="number"
                                value={formData.maximumStock || ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        maximumStock: e.target.value
                                            ? parseFloat(e.target.value)
                                            : undefined,
                                    })
                                }
                                min={0}
                                step="0.01"
                                placeholder="Leave empty for unlimited"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Location */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Storage Location (Optional)
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        location: e.target.value,
                                    })
                                }
                                placeholder="e.g., Warehouse A, Shelf 3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (Optional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                }
                                rows={2}
                                placeholder="Brief description of the item"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Specifications */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Specifications (Optional)
                            </label>
                            <textarea
                                value={formData.specifications}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        specifications: e.target.value,
                                    })
                                }
                                rows={3}
                                placeholder="Technical specifications, dimensions, etc."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                        >
                            {loading
                                ? "Saving..."
                                : editItem
                                  ? "Update Item"
                                  : "Create Item"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddItemModal;
