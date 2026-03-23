import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { STATUS_COLORS, STATUS_DISPLAY_NAMES } from "../../types";

interface RequestItem {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    specifications?: string;
    notes?: string;
}

interface ApprovalAction {
    id: string;
    action: string;
    fromStatus: string;
    toStatus: string;
    remarks?: string;
    createdAt: string;
    approver: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
}

interface RequestDetail {
    id: string;
    requestNumber: string;
    type: string;
    status: string;
    priority: string;
    description: string;
    justification?: string;
    expectedDate?: string;
    estimatedCost?: number;
    actualCost?: number;
    vendorName?: string;
    poNumber?: string;
    procurementNotes?: string;
    createdAt: string;
    updatedAt: string;
    site: {
        name: string;
        code: string;
    };
    targetSite?: {
        name: string;
        code: string;
    };
    requester: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    items: RequestItem[];
    approvalActions: ApprovalAction[];
}

const RequestDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { } = useAuth();
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRequest = async () => {
            if (!id) return;
            try {
                const response = await apiClient.requests.get(id);
                if (response.data.success && response.data.data) {
                    setRequest(response.data.data.request as RequestDetail);
                } else {
                    setError(response.data.error || "Failed to fetch request");
                }
            } catch (err) {
                setError("Failed to fetch request details");
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600">
                        {error || "Request not found"}
                    </p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="text-primary-600 hover:text-primary-900"
                >
                    ← Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
            >
                ← Back
            </button>

            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Request {request.requestNumber}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Type: {request.type} • Priority: {request.priority}
                        </p>
                    </div>
                    <span
                        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                            STATUS_COLORS[
                                request.status as keyof typeof STATUS_COLORS
                            ] || "bg-gray-100"
                        }`}
                    >
                        {STATUS_DISPLAY_NAMES[
                            request.status as keyof typeof STATUS_DISPLAY_NAMES
                        ] || request.status}
                    </span>
                </div>
            </div>

            {/* Requester & Site Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Requester Information
                    </h2>
                    <div className="space-y-2">
                        <p>
                            <span className="font-medium">Name:</span>{" "}
                            {request.requester.firstName}{" "}
                            {request.requester.lastName}
                        </p>
                        <p>
                            <span className="font-medium">Email:</span>{" "}
                            {request.requester.email}
                        </p>
                        <p>
                            <span className="font-medium">Role:</span>{" "}
                            {request.requester.role.replace("_", " ")}
                        </p>
                        <p>
                            <span className="font-medium">Requested On:</span>{" "}
                            {new Date(request.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Site Information
                    </h2>
                    <div className="space-y-2">
                        <p>
                            <span className="font-medium">Site:</span>{" "}
                            {request.site.name} ({request.site.code})
                        </p>
                        {request.targetSite && (
                            <p>
                                <span className="font-medium">
                                    Target Site:
                                </span>{" "}
                                {request.targetSite.name} (
                                {request.targetSite.code})
                            </p>
                        )}
                        {request.expectedDate && (
                            <p>
                                <span className="font-medium">
                                    Expected Date:
                                </span>{" "}
                                {new Date(
                                    request.expectedDate,
                                ).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Description
                </h2>
                <p className="text-gray-700">{request.description}</p>
                {request.justification && (
                    <div className="mt-4">
                        <p className="font-medium text-gray-900">
                            Justification:
                        </p>
                        <p className="text-gray-700">{request.justification}</p>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Requested Items
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Item
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Quantity
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Unit
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Specifications
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Notes
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {request.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {item.itemName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.unit}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {item.specifications || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {item.notes || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approval History */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Approval History
                </h2>
                {request.approvalActions &&
                request.approvalActions.length > 0 ? (
                    <div className="space-y-4">
                        {request.approvalActions.map((action) => (
                            <div
                                key={action.id}
                                className="border-l-4 border-primary-500 pl-4 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`font-medium ${
                                            action.action === "approve"
                                                ? "text-green-600"
                                                : action.action === "reject"
                                                  ? "text-red-600"
                                                  : "text-gray-600"
                                        }`}
                                    >
                                        {action.action.charAt(0).toUpperCase() +
                                            action.action.slice(1)}
                                    </span>
                                    <span className="text-gray-500">
                                        by {action.approver.firstName}{" "}
                                        {action.approver.lastName} (
                                        {action.approver.role.replace("_", " ")}
                                        )
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                    {action.fromStatus} → {action.toStatus}
                                </p>
                                {action.remarks && (
                                    <p className="text-sm text-gray-700 mt-1">
                                        Remarks: {action.remarks}
                                    </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(
                                        action.createdAt,
                                    ).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No approval actions yet.</p>
                )}
            </div>

            {/* Procurement Details (if available) */}
            {(request.vendorName ||
                request.poNumber ||
                request.procurementNotes) && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Procurement Details
                    </h2>
                    <div className="space-y-2">
                        {request.vendorName && (
                            <p>
                                <span className="font-medium">Vendor:</span>{" "}
                                {request.vendorName}
                            </p>
                        )}
                        {request.poNumber && (
                            <p>
                                <span className="font-medium">PO Number:</span>{" "}
                                {request.poNumber}
                            </p>
                        )}
                        {request.actualCost && (
                            <p>
                                <span className="font-medium">
                                    Actual Cost:
                                </span>{" "}
                                ${request.actualCost.toFixed(2)}
                            </p>
                        )}
                        {request.procurementNotes && (
                            <p>
                                <span className="font-medium">Notes:</span>{" "}
                                {request.procurementNotes}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestDetail;
