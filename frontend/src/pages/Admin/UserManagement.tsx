import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api";
import { User, Role, ROLE_DISPLAY_NAMES, Site } from "../../types";

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<{
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        isActive: boolean;
        password: string;
        siteIds: string[];
    }>({
        email: "",
        firstName: "",
        lastName: "",
        role: "",
        isActive: true,
        password: "",
        siteIds: [],
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchSites();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await apiClient.users.list();
            if (response.data.success) {
                setUsers((response.data.data as { users: User[] }).users);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await apiClient.roles.list();
            if (response.data.success) {
                setRoles((response.data.data as { roles: Role[] }).roles);
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        }
    };

    const fetchSites = async () => {
        try {
            const response = await apiClient.sites.list({ status: "active" });
            if (response.data.success) {
                const data = response.data.data as { sites: Site[] };
                setSites(data.sites);
            }
        } catch (error) {
            console.error("Failed to fetch sites:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                // For update, only include password if it's provided
                const updateData: Record<string, unknown> = {
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    role: formData.role,
                    isActive: formData.isActive,
                    siteIds: formData.siteIds,
                };
                // Only include password if it's not empty
                if (formData.password) {
                    (updateData as Record<string, unknown>).password =
                        formData.password;
                }
                await apiClient.users.update(editingUser.id, updateData);
            } else {
                await apiClient.users.create(formData);
            }
            setShowForm(false);
            setEditingUser(null);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error("Failed to save user:", error);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        const userSiteIds =
            user.assignedSites?.map((site: Site) => site.id) || [];
        setFormData({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role?.name || "",
            isActive: user.isActive,
            password: "",
            siteIds: userSiteIds,
        });
        setShowForm(true);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await apiClient.users.delete(userId);
            fetchUsers();
        } catch (error) {
            console.error("Failed to delete user:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            email: "",
            firstName: "",
            lastName: "",
            role: "",
            isActive: true,
            password: "",
            siteIds: [],
        });
    };

    const handleSiteToggle = (siteId: string) => {
        setFormData((prev) => ({
            ...prev,
            siteIds: prev.siteIds.includes(siteId)
                ? prev.siteIds.filter((id) => id !== siteId)
                : [...prev.siteIds, siteId],
        }));
    };

    const getRoleDisplayName = (role: Role | string | undefined): string => {
        if (!role) return "Unknown";
        const roleName = typeof role === "string" ? role : role.name;
        return (
            ROLE_DISPLAY_NAMES[roleName as keyof typeof ROLE_DISPLAY_NAMES] ||
            roleName
        );
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
                    User Management
                </h1>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditingUser(null);
                        resetForm();
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    Add User
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        {editingUser ? "Edit User" : "Create New User"}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {editingUser
                                        ? "New Password (leave blank to keep current)"
                                        : "Password *"}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    required={!editingUser}
                                    minLength={8}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder={
                                        editingUser
                                            ? "Enter new password"
                                            : "Minimum 8 characters"
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            firstName: e.target.value,
                                        })
                                    }
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            lastName: e.target.value,
                                        })
                                    }
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Role
                                </label>
                                <select
                                    value={formData.role}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            role: e.target.value,
                                        })
                                    }
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Select Role</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.name}>
                                            {getRoleDisplayName(role.name)} (
                                            {role.description})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            isActive: e.target.checked,
                                        })
                                    }
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">
                                    Active
                                </label>
                            </div>
                        </div>

                        {/* Site Assignment */}
                        <div className="pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assigned Sites (select one or more)
                            </label>
                            {sites.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No active sites available
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {sites.map((site) => (
                                        <label
                                            key={site.id}
                                            className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData.siteIds.includes(
                                                    site.id,
                                                )}
                                                onChange={() =>
                                                    handleSiteToggle(site.id)
                                                }
                                                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {site.name}
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
                                    setEditingUser(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                                {editingUser ? "Update" : "Create"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Sites
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
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {user.firstName} {user.lastName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {getRoleDisplayName(user.role)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.assignedSites &&
                                    user.assignedSites.length > 0
                                        ? user.assignedSites
                                              .map((s: Site) => s.name)
                                              .join(", ")
                                        : "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            user.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                        {user.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="text-primary-600 hover:text-primary-900 mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
