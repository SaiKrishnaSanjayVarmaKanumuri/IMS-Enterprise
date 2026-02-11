import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/api";
import { Role, Permission, ROLE_DISPLAY_NAMES } from "../../types";

// Default permissions mapping for system roles
const SYSTEM_ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: ["*"], // Admin gets all permissions
    SITE_ENGINEER: [
        "auth:login",
        "sites:read",
        "requests:read:own",
        "requests:read:approval",
        "requests:update",
        "requests:approve:engineer",
        "requests:reject:engineer",
    ],
    PROCUREMENT: [
        "auth:login",
        "requests:read:approval",
        "requests:approve:procurement",
        "requests:reject:procurement",
        "procurement:assign-vendor",
        "procurement:create-po",
        "procurement:update-delivery",
    ],
    FINANCE: [
        "auth:login",
        "requests:read:approval",
        "requests:approve:finance",
        "requests:reject:finance",
        "finance:review-cost",
        "finance:approve-budget",
    ],
    FRONT_MAN: [
        "auth:login",
        "sites:read",
        "requests:create",
        "requests:read:own",
        "requests:update",
        "requests:cancel",
    ],
};

// Role descriptions for system roles
const SYSTEM_ROLE_DESCRIPTIONS: Record<string, string> = {
    ADMIN: "System Administrator - Full access",
    SITE_ENGINEER: "Site Engineer - Approve/reject requests at site level",
    PROCUREMENT: "Procurement Team - Vendor assignment and PO creation",
    FINANCE: "Finance Team - Financial approval and budget review",
    FRONT_MAN: "Front Man - Raise material/shifting requests",
};

interface CreatedUser {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleName: string;
}

const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isCustomRole, setIsCustomRole] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);
    const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        permissionIds: [] as string[],
    });
    const [userFormData, setUserFormData] = useState({
        email: "",
        firstName: "",
        lastName: "",
        createUser: false,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const rolesRes = await apiClient.roles.list();
            const permsRes = await apiClient.permissions.list();

            if (rolesRes.data.success) {
                setRoles((rolesRes.data.data as { roles: Role[] }).roles);
            }
            if (permsRes.data.success) {
                setPermissions(
                    (permsRes.data.data as { permissions: Permission[] })
                        .permissions,
                );
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await apiClient.roles.update(editingRole.id, formData);
            } else {
                await apiClient.roles.create(formData);

                // If admin wants to create a user with this role
                if (userFormData.createUser && userFormData.email) {
                    const generatedPassword = Math.random()
                        .toString(36)
                        .slice(-8);
                    await apiClient.users.create({
                        email: userFormData.email,
                        firstName: userFormData.firstName,
                        lastName: userFormData.lastName,
                        role: formData.name,
                        password: generatedPassword,
                    });

                    // Show credentials
                    setCreatedUser({
                        email: userFormData.email,
                        password: generatedPassword,
                        firstName: userFormData.firstName,
                        lastName: userFormData.lastName,
                        roleName: formData.name,
                    });
                    setShowCredentials(true);
                }
            }

            if (!showCredentials) {
                setShowForm(false);
                setEditingRole(null);
                resetForm();
            }
            fetchData();
        } catch (error) {
            console.error("Failed to save role:", error);
        }
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description,
            permissionIds: role.permissions?.map((p: Permission) => p.id) || [],
        });
        setShowForm(true);
    };

    const handleDelete = async (roleId: string) => {
        if (!confirm("Are you sure you want to delete this role?")) return;
        try {
            await apiClient.roles.delete(roleId);
            fetchData();
        } catch (error) {
            console.error("Failed to delete role:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            permissionIds: [],
        });
        setUserFormData({
            email: "",
            firstName: "",
            lastName: "",
            createUser: false,
        });
        setIsCustomRole(false);
        setShowCredentials(false);
        setCreatedUser(null);
    };

    // Auto-select permissions and description when role type changes
    const handleRoleTypeChange = (roleName: string) => {
        const selectedRole = roleName as keyof typeof SYSTEM_ROLE_PERMISSIONS;

        // Find permission IDs that match the default permissions for this role
        let selectedPermissionIds: string[] = [];

        if (SYSTEM_ROLE_PERMISSIONS[selectedRole]) {
            // For ADMIN with wildcard, select all permissions
            if (SYSTEM_ROLE_PERMISSIONS[selectedRole].includes("*")) {
                selectedPermissionIds = permissions.map((p) => p.id);
            } else {
                // Match by permission name
                const permNames = SYSTEM_ROLE_PERMISSIONS[selectedRole];
                selectedPermissionIds = permissions
                    .filter((p) => permNames.includes(p.name))
                    .map((p) => p.id);
            }
        }

        setFormData((prev) => ({
            ...prev,
            name: roleName,
            description: SYSTEM_ROLE_DESCRIPTIONS[selectedRole] || "",
            permissionIds: selectedPermissionIds,
        }));
    };

    const togglePermission = (permId: string) => {
        setFormData((prev) => ({
            ...prev,
            permissionIds: prev.permissionIds.includes(permId)
                ? prev.permissionIds.filter((id) => id !== permId)
                : [...prev.permissionIds, permId],
        }));
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
                    Role Management
                </h1>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditingRole(null);
                        resetForm();
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                    Create Role
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-lg shadow p-6 max-w-4xl">
                    {showCredentials && createdUser ? (
                        // Show credentials after successful user creation
                        <div className="text-center">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                                <div className="flex justify-center mb-4">
                                    <div className="bg-green-100 rounded-full p-3">
                                        <svg
                                            className="w-12 h-12 text-green-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                </div>
                                <h3 className="text-xl font-semibold text-green-800 mb-2">
                                    User Created Successfully!
                                </h3>
                                <p className="text-green-700 mb-4">
                                    Share these credentials with the user:
                                </p>

                                <div className="bg-white rounded-lg p-4 text-left max-w-md mx-auto">
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-sm text-gray-500">
                                                Name:
                                            </span>
                                            <p className="font-medium">
                                                {createdUser.firstName}{" "}
                                                {createdUser.lastName}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-sm text-gray-500">
                                                Role:
                                            </span>
                                            <p className="font-medium">
                                                {createdUser.roleName}
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 p-3 rounded">
                                            <span className="text-sm text-blue-600">
                                                Email:
                                            </span>
                                            <p className="font-mono font-medium text-blue-800">
                                                {createdUser.email}
                                            </p>
                                        </div>
                                        <div className="bg-yellow-50 p-3 rounded">
                                            <span className="text-sm text-yellow-600">
                                                Password:
                                            </span>
                                            <p className="font-mono font-medium text-yellow-800">
                                                {createdUser.password}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setShowCredentials(false);
                                    setCreatedUser(null);
                                    resetForm();
                                }}
                                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        // Role creation form
                        <>
                            <h2 className="text-lg font-semibold mb-4">
                                {editingRole ? "Edit Role" : "Create New Role"}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Role Name
                                        </label>
                                        {!editingRole && (
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="roleType"
                                                        checked={!isCustomRole}
                                                        onChange={() => {
                                                            setIsCustomRole(
                                                                false,
                                                            );
                                                            setFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    name: "",
                                                                    description:
                                                                        "",
                                                                    permissionIds:
                                                                        [],
                                                                }),
                                                            );
                                                        }}
                                                        className="h-4 w-4 text-primary-600"
                                                    />
                                                    <span className="text-sm text-gray-700">
                                                        Select System Role
                                                    </span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="roleType"
                                                        checked={isCustomRole}
                                                        onChange={() => {
                                                            setIsCustomRole(
                                                                true,
                                                            );
                                                            setFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    name: "",
                                                                    description:
                                                                        "",
                                                                    permissionIds:
                                                                        [],
                                                                }),
                                                            );
                                                        }}
                                                        className="h-4 w-4 text-primary-600"
                                                    />
                                                    <span className="text-sm text-gray-700">
                                                        Create Custom Role
                                                    </span>
                                                </label>
                                            </div>
                                        )}

                                        {isCustomRole || editingRole ? (
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        name: e.target.value
                                                            .toUpperCase()
                                                            .replace(
                                                                /\s+/g,
                                                                "_",
                                                            ),
                                                    })
                                                }
                                                placeholder="e.g., CUSTOM_ROLE"
                                                required
                                                className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                                pattern="[A-Z][A-Z0-9_]*"
                                                title="Uppercase letters, numbers, and underscores only"
                                            />
                                        ) : (
                                            <select
                                                value={formData.name}
                                                onChange={(e) =>
                                                    handleRoleTypeChange(
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">
                                                    Select role type
                                                </option>
                                                <option value="ADMIN">
                                                    Admin
                                                </option>
                                                <option value="SITE_ENGINEER">
                                                    Site Engineer
                                                </option>
                                                <option value="PROCUREMENT">
                                                    Procurement
                                                </option>
                                                <option value="FINANCE">
                                                    Finance
                                                </option>
                                                <option value="FRONT_MAN">
                                                    Front Man
                                                </option>
                                            </select>
                                        )}
                                        {!editingRole &&
                                            formData.name &&
                                            !isCustomRole && (
                                                <p className="mt-1 text-xs text-blue-600">
                                                    Default permissions will be
                                                    auto-selected
                                                </p>
                                            )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    description: e.target.value,
                                                })
                                            }
                                            required
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                                            placeholder="Enter role description"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Permissions
                                    </label>
                                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-4">
                                        {permissions.length === 0 ? (
                                            <p className="text-gray-500 text-sm">
                                                No permissions available
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {permissions.map((perm) => (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-center space-x-2 cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissionIds.includes(
                                                                perm.id,
                                                            )}
                                                            onChange={() =>
                                                                togglePermission(
                                                                    perm.id,
                                                                )
                                                            }
                                                            className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">
                                                            <span className="font-medium">
                                                                {perm.resource}:
                                                                {perm.action}
                                                            </span>
                                                            <span className="text-gray-500 ml-1">
                                                                -{" "}
                                                                {
                                                                    perm.description
                                                                }
                                                            </span>
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* User Creation Section */}
                                {!editingRole && (
                                    <div className="border-t pt-4">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    userFormData.createUser
                                                }
                                                onChange={(e) =>
                                                    setUserFormData((prev) => ({
                                                        ...prev,
                                                        createUser:
                                                            e.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                                            />
                                            <span className="text-sm font-medium text-gray-700">
                                                Create user account with this
                                                role
                                            </span>
                                        </label>

                                        {userFormData.createUser && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 ml-7">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        First Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            userFormData.firstName
                                                        }
                                                        onChange={(e) =>
                                                            setUserFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    firstName:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        required={
                                                            userFormData.createUser
                                                        }
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        placeholder="John"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Last Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            userFormData.lastName
                                                        }
                                                        onChange={(e) =>
                                                            setUserFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    lastName:
                                                                        e.target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        required={
                                                            userFormData.createUser
                                                        }
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        placeholder="Doe"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Email
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={
                                                            userFormData.email
                                                        }
                                                        onChange={(e) =>
                                                            setUserFormData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    email: e
                                                                        .target
                                                                        .value,
                                                                }),
                                                            )
                                                        }
                                                        required={
                                                            userFormData.createUser
                                                        }
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        placeholder="john.doe@ims.com"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end space-x-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForm(false);
                                            setEditingRole(null);
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
                                        {editingRole ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Permissions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {roles.map((role) => (
                            <tr key={role.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {ROLE_DISPLAY_NAMES[
                                            role.name as keyof typeof ROLE_DISPLAY_NAMES
                                        ] || role.name}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {role.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-500">
                                        {role.permissions?.length || 0}{" "}
                                        permissions
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(role)}
                                        className="text-primary-600 hover:text-primary-900 mr-4"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(role.id)}
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

export default RoleManagement;
