import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api";
import { Site, User } from "../../types";

const SiteManagement: React.FC = () => {
    const [sites, setSites] = useState<Site[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSite, setEditingSite] = useState<Site | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        projectManager: "",
        status: "active",
        userIds: [] as string[],
    });

    useEffect(() => {
        fetchSites();
        fetchUsers();
    }, []);

    const fetchSites = async () => {
        try {
            const response = await apiClient.sites.list();
            if (response.data.success) {
                setSites((response.data.data as { sites: Site[] }).sites);
            }
        } catch (err) {
            console.error("Failed to fetch sites:", err);
            setError("Failed to load sites");
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await apiClient.users.list();
            if (response.data.success) {
                const data = response.data.data as { users: User[] };
                // Filter active users only
                const activeUsers = data.users.filter((u: User) => u.isActive);
                setUsers(activeUsers);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            code: "",
            address: "",
            projectManager: "",
            status: "active",
            userIds: [],
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            if (editingSite) {
                await apiClient.sites.update(editingSite.id, formData);
                setSuccess("Site updated successfully");
            } else {
                await apiClient.sites.create(formData);
                setSuccess("Site created successfully");
            }

            setShowForm(false);
            setEditingSite(null);
            resetForm();
            fetchSites();
        } catch (err: unknown) {
            console.error("Failed to save site:", err);

            const axiosErr = err as {
                response?: { data?: { error?: string; message?: string } };
            };

            const errorMsg =
                axiosErr.response?.data?.error ||
                axiosErr.response?.data?.message ||
                "Failed to save site. Please try again.";

            setError(errorMsg);
        }
    };

    const handleEdit = (site: Site) => {
        setEditingSite(site);
        setFormData({
            name: site.name,
            code: site.code,
            address: site.address,
            projectManager: site.projectManager || "",
            status: site.status,
            userIds: site.assignedUsers?.map((u: User) => u.id) || [],
        });
        setShowForm(true);
        setError(null);
        setSuccess(null);
    };

    const handleDelete = async (siteId: string) => {
        if (!confirm("Are you sure you want to delete this site?")) return;

        setError(null);
        setSuccess(null);

        try {
            await apiClient.sites.delete(siteId);
            setSuccess("Site deleted successfully");
            fetchSites();
        } catch (err: unknown) {
            console.error("Failed to delete site:", err);

            const axiosErr = err as {
                response?: { data?: { error?: string; message?: string } };
            };

            const errorMsg =
                axiosErr.response?.data?.error ||
                axiosErr.response?.data?.message ||
                "Failed to delete site. Please try again.";

            setError(errorMsg);
        }
    };

    const handleUserToggle = (userId: string) => {
        setFormData((prev) => ({
            ...prev,
            userIds: prev.userIds.includes(userId)
                ? prev.userIds.filter((id) => id !== userId)
                : [...prev.userIds, userId],
        }));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-800";
            case "inactive":
                return "bg-gray-100 text-gray-800";
            case "completed":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
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
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    Site Management
                </h1>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditingSite(null);
                        resetForm();
                        setError(null);
                        setSuccess(null);
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    Add Site
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                    {success}
                </div>
            )}

            {showForm && (
                <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
                    <h2 className="text-lg font-semibold mb-4">
                        {editingSite ? "Edit Site" : "Create New Site"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Site Name *
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
                                    placeholder="e.g., Downtown Tower"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Site Code *
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value
                                                .toUpperCase()
                                                .replace(/\s+/g, "-"),
                                        })
                                    }
                                    required
                                    minLength={3}
                                    maxLength={20}
                                    placeholder="e.g., SITE-001"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address *
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            address: e.target.value,
                                        })
                                    }
                                    required
                                    placeholder="Full address"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Project Manager
                                </label>
                                <input
                                    type="text"
                                    value={formData.projectManager}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            projectManager: e.target.value,
                                        })
                                    }
                                    placeholder="Manager name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value,
                                        })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>

                        {/* User Assignment */}
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assign Users (Optional)
                            </label>
                            {users.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No active users available
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                                    {users.map((user) => (
                                        <label
                                            key={user.id}
                                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.userIds.includes(
                                                    user.id,
                                                )}
                                                onChange={() =>
                                                    handleUserToggle(user.id)
                                                }
                                                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700 truncate">
                                                {user.firstName} {user.lastName}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingSite(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                                {editingSite ? "Update" : "Create"} Site
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {sites.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-gray-500">
                        No sites found. Create your first site.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sites.map((site) => (
                        <div
                            key={site.id}
                            className="bg-white rounded-lg shadow overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {site.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {site.code}
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                            site.status,
                                        )}`}
                                    >
                                        {site.status}
                                    </span>
                                </div>

                                <p className="mt-3 text-sm text-gray-600">
                                    {site.address}
                                </p>

                                {site.projectManager && (
                                    <p className="mt-2 text-sm text-gray-500">
                                        Manager: {site.projectManager}
                                    </p>
                                )}

                                {site.assignedUsers &&
                                    site.assignedUsers.length > 0 && (
                                        <p className="mt-2 text-sm text-gray-500">
                                            Users: {site.assignedUsers.length}{" "}
                                            assigned
                                        </p>
                                    )}

                                <div className="mt-4 flex justify-end space-x-2">
                                    <button
                                        onClick={() => handleEdit(site)}
                                        className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(site.id)}
                                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SiteManagement;
