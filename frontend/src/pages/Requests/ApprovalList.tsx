import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { STATUS_COLORS, STATUS_DISPLAY_NAMES } from "../../types";

// User Role constants (matching the UserRole type)
const USER_ROLES = {
    SITE_ENGINEER: "SITE_ENGINEER",
    PROCUREMENT: "PROCUREMENT",
    FINANCE: "FINANCE",
} as const;

interface ApprovalRequest {
    id: string;
    requestNumber: string;
    type: string;
    status: string;
    priority: string;
    description: string;
    site: { name: string; code: string };
    requester: { firstName: string; lastName: string };
    items: Array<{ itemName: string; quantity: number; unit: string }>;
    createdAt: string;
}

const ApprovalList: React.FC = () => {
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] =
        useState<ApprovalRequest | null>(null);
    const [actionType, setActionType] = useState<"approve" | "reject">(
        "approve",
    );
    const [remarks, setRemarks] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchApprovals = async () => {
            try {
                let response;
                if (hasRole(USER_ROLES.SITE_ENGINEER)) {
                    response = await apiClient.requests.list({
                        status: "PENDING",
                        limit: 50,
                    });
                } else if (hasRole(USER_ROLES.PROCUREMENT)) {
                    response = await apiClient.requests.list({
                        status: "ENGINEER_APPROVED",
                        limit: 50,
                    });
                } else if (hasRole(USER_ROLES.FINANCE)) {
                    response = await apiClient.requests.list({
                        status: "PROCUREMENT_APPROVED",
                        limit: 50,
                    });
                }

                if (response?.data.success) {
                    setRequests(
                        (response.data.data as { requests: ApprovalRequest[] })
                            .requests,
                    );
                }
            } catch (error) {
                console.error("Failed to fetch approvals:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchApprovals();
    }, [hasRole]);

    const handleAction = async () => {
        if (!selectedRequest || !user) return;

        setSubmitting(true);
        try {
            const endpoint = actionType === "approve" ? `approve` : `reject`;

            await apiClient.requests[actionType](selectedRequest.id, remarks);

            setSelectedRequest(null);
            setRemarks("");
            // Refresh list
            window.location.reload();
        } catch (error) {
            console.error("Action failed:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const canApprove = (request: ApprovalRequest): boolean => {
        if (!user) return false;
        if (hasRole(USER_ROLES.SITE_ENGINEER))
            return request.status === "PENDING";
        if (hasRole(USER_ROLES.PROCUREMENT))
            return request.status === "ENGINEER_APPROVED";
        if (hasRole(USER_ROLES.FINANCE))
            return request.status === "PROCUREMENT_APPROVED";
        return false;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
                Pending Approvals
            </h1>

            {requests.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                    <p className="text-gray-500">
                        No requests pending your approval.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Request #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Site
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Priority
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requests.map((request) => (
                                <tr key={request.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {request.requestNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {request.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {request.site.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                request.priority === "urgent"
                                                    ? "bg-red-100 text-red-800"
                                                    : request.priority ===
                                                        "high"
                                                      ? "bg-orange-100 text-orange-800"
                                                      : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {request.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                STATUS_COLORS[
                                                    request.status as keyof typeof STATUS_COLORS
                                                ] || "bg-gray-100"
                                            }`}
                                        >
                                            {STATUS_DISPLAY_NAMES[
                                                request.status as keyof typeof STATUS_DISPLAY_NAMES
                                            ] || request.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {canApprove(request) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setActionType("approve");
                                                    setRemarks("");
                                                }}
                                                className="text-green-600 hover:text-green-900 mr-4"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {canApprove(request) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setActionType("reject");
                                                    setRemarks("");
                                                }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Reject
                                            </button>
                                        )}
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/requests/${request.id}`,
                                                )
                                            }
                                            className="text-primary-600 hover:text-primary-900 ml-4"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Action Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            {actionType === "approve" ? "Approve" : "Reject"}{" "}
                            Request {selectedRequest.requestNumber}
                        </h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Remarks{" "}
                                {actionType === "reject" && (
                                    <span className="text-red-500">*</span>
                                )}
                            </label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                rows={3}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Add your remarks..."
                            />
                            {actionType === "reject" && !remarks && (
                                <p className="mt-1 text-sm text-red-600">
                                    Remarks are required for rejection
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setSelectedRequest(null)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={
                                    submitting ||
                                    (actionType === "reject" && !remarks)
                                }
                                className={`px-4 py-2 rounded-md text-white ${
                                    actionType === "approve"
                                        ? "bg-green-600 hover:bg-green-700"
                                        : "bg-red-600 hover:bg-red-700"
                                } disabled:opacity-50`}
                            >
                                {submitting
                                    ? "Processing..."
                                    : actionType === "approve"
                                      ? "Approve"
                                      : "Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalList;
