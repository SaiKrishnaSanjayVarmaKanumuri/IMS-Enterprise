import React, { useState } from "react";
import { apiClient } from "../services/api";
import { InventoryItem, StockMovementForm, MOVEMENT_REASONS } from "../types";

interface StockMovementModalProps {
    item: InventoryItem;
    onClose: () => void;
    onSuccess: () => void;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({
    item,
    onClose,
    onSuccess,
}) => {
    const [formData, setFormData] = useState<StockMovementForm>({
        type: "ADD",
        quantity: 1,
        reason: "",
        reference: "",
        notes: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await apiClient.inventory.addStock(item.id, formData);
            onSuccess();
        } catch (err: any) {
            setError(
                err.response?.data?.error || "Failed to process stock movement",
            );
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (value: string) => {
        const qty = parseFloat(value);
        if (formData.type === "CONSUME" && qty > item.currentStock) {
            setError(`Maximum available: ${item.currentStock} ${item.unit}`);
        } else {
            setError("");
        }
        setFormData((prev) => ({ ...prev, quantity: qty }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">
                    {formData.type === "ADD" ? "Add Stock" : "Consume Stock"}
                </h2>

                <div className="mb-4 p-3 bg-gray-100 rounded">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">
                        Code: {item.code} | Current Stock: {item.currentStock}{" "}
                        {item.unit}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Movement Type
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    type: e.target.value as "ADD" | "CONSUME",
                                }))
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="ADD">Add Stock</option>
                            <option value="CONSUME">Consume Stock</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity ({item.unit})
                        </label>
                        <input
                            type="number"
                            min={0.0001}
                            step={0.0001}
                            value={formData.quantity}
                            onChange={(e) =>
                                handleQuantityChange(e.target.value)
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason
                        </label>
                        <select
                            value={formData.reason || ""}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    reason: e.target.value,
                                }))
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="">Select reason</option>
                            {MOVEMENT_REASONS.map((reason) => (
                                <option key={reason.value} value={reason.value}>
                                    {reason.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reference (optional)
                        </label>
                        <input
                            type="text"
                            value={formData.reference || ""}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    reference: e.target.value,
                                }))
                            }
                            placeholder="e.g., PO number, Delivery note"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            value={formData.notes || ""}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                }))
                            }
                            rows={2}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !!error}
                            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                        >
                            {loading ? "Processing..." : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockMovementModal;
