import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { ApiResponse } from "../types";

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("ims_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<unknown>>) => {
        return response;
    },
    async (error: AxiosError<ApiResponse<unknown>>) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            // Clear local storage and redirect to login
            localStorage.removeItem("ims_token");
            localStorage.removeItem("ims_user");

            // Only redirect if not already on login page
            if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        }

        return Promise.reject(error);
    },
);

// API helper functions
export const apiClient = {
    // Auth endpoints
    auth: {
        login: (email: string, password: string) =>
            api.post<ApiResponse<{ user: unknown; token: string }>>(
                "/auth/login",
                { email, password },
            ),

        me: () => api.get<ApiResponse<{ user: unknown }>>("/auth/me"),

        changePassword: (currentPassword: string, newPassword: string) =>
            api.post<ApiResponse<null>>("/auth/change-password", {
                currentPassword,
                newPassword,
            }),

        logout: () => api.post<ApiResponse<null>>("/auth/logout"),
    },

    // User endpoints (Admin only)
    users: {
        list: (params?: {
            role?: string;
            isActive?: boolean;
            page?: number;
            limit?: number;
        }) =>
            api.get<ApiResponse<{ users: unknown[]; pagination: unknown }>>(
                "/users",
                { params },
            ),

        get: (id: string) =>
            api.get<ApiResponse<{ user: unknown }>>(`/users/${id}`),

        create: (data: {
            email: string;
            firstName: string;
            lastName: string;
            role: string;
            password: string;
            siteIds?: string[];
        }) => api.post<ApiResponse<{ user: unknown }>>("/users", data),

        update: (
            id: string,
            data: Partial<{
                firstName: string;
                lastName: string;
                role: string;
                isActive: boolean;
                siteIds: string[];
            }>,
        ) => api.patch<ApiResponse<{ user: unknown }>>(`/users/${id}`, data),

        delete: (id: string) => api.delete<ApiResponse<null>>(`/users/${id}`),

        resetPassword: (id: string, newPassword: string) =>
            api.post<ApiResponse<null>>(`/users/${id}/reset-password`, {
                newPassword,
            }),
    },

    // Role endpoints (Admin only)
    roles: {
        list: () => api.get<ApiResponse<{ roles: unknown[] }>>("/roles"),

        get: (id: string) =>
            api.get<ApiResponse<{ role: unknown }>>(`/roles/${id}`),

        create: (data: {
            name: string;
            description: string;
            permissionIds: string[];
        }) => api.post<ApiResponse<{ role: unknown }>>("/roles", data),

        update: (
            id: string,
            data: Partial<{
                description: string;
                permissionIds: string[];
            }>,
        ) => api.patch<ApiResponse<{ role: unknown }>>(`/roles/${id}`, data),

        delete: (id: string) => api.delete<ApiResponse<null>>(`/roles/${id}`),

        getPermissions: (id: string) =>
            api.get<
                ApiResponse<{
                    rolePermissions: unknown[];
                    allPermissions: unknown[];
                }>
            >(`/roles/${id}/permissions`),
    },

    // Permission endpoints (Admin only)
    permissions: {
        list: () =>
            api.get<
                ApiResponse<{
                    permissions: unknown[];
                }>
            >("/permissions"),
    },

    // Site endpoints
    sites: {
        list: (params?: { status?: string; page?: number; limit?: number }) =>
            api.get<ApiResponse<{ sites: unknown[]; pagination: unknown }>>(
                "/sites",
                { params },
            ),

        get: (id: string) =>
            api.get<ApiResponse<{ site: unknown }>>(`/sites/${id}`),

        create: (data: {
            name: string;
            code: string;
            address: string;
            projectManager?: string;
            status?: string;
            userIds?: string[];
        }) => api.post<ApiResponse<{ site: unknown }>>("/sites", data),

        update: (
            id: string,
            data: Partial<{
                name: string;
                code: string;
                address: string;
                projectManager: string;
                status: string;
                userIds: string[];
            }>,
        ) => api.patch<ApiResponse<{ site: unknown }>>(`/sites/${id}`, data),

        delete: (id: string) => api.delete<ApiResponse<null>>(`/sites/${id}`),

        assignUsers: (id: string, userIds: string[]) =>
            api.post<ApiResponse<{ site: unknown }>>(`/sites/${id}/users`, {
                userIds,
            }),

        removeUser: (id: string, userId: string) =>
            api.delete<ApiResponse<{ site: unknown }>>(
                `/sites/${id}/users/${userId}`,
            ),
    },

    // Request endpoints
    requests: {
        list: (params?: {
            status?: string;
            siteId?: string;
            type?: string;
            page?: number;
            limit?: number;
        }) =>
            api.get<ApiResponse<{ requests: unknown[]; pagination: unknown }>>(
                "/requests",
                { params },
            ),

        get: (id: string) =>
            api.get<ApiResponse<{ request: unknown }>>(`/requests/${id}`),

        create: (data: {
            type: string;
            siteId: string;
            targetSiteId?: string;
            description: string;
            justification?: string;
            expectedDate?: string;
            priority?: string;
            items: Array<{
                itemName: string;
                quantity: number;
                unit: string;
                specifications?: string;
                notes?: string;
            }>;
        }) => api.post<ApiResponse<{ request: unknown }>>("/requests", data),

        approve: (id: string, remarks?: string) =>
            api.patch<ApiResponse<{ request: unknown }>>(
                `/requests/${id}/approve`,
                { remarks },
            ),

        reject: (id: string, remarks: string) =>
            api.patch<ApiResponse<null>>(`/requests/${id}/reject`, { remarks }),

        cancel: (id: string, reason?: string) =>
            api.patch<ApiResponse<null>>(`/requests/${id}/cancel`, { reason }),

        updateProcurement: (
            id: string,
            data: {
                vendorId?: string;
                vendorName?: string;
                poNumber?: string;
                procurementNotes?: string;
                actualCost?: number;
            },
        ) =>
            api.patch<ApiResponse<{ request: unknown }>>(
                `/requests/${id}/procurement`,
                data,
            ),
    },

    // Inventory endpoints
    inventory: {
        list: (params?: {
            siteId?: string;
            category?: string;
            search?: string;
            page?: number;
            limit?: number;
        }) =>
            api.get<ApiResponse<{ items: unknown[]; pagination: unknown }>>(
                "/inventory",
                { params },
            ),

        get: (id: string) =>
            api.get<ApiResponse<{ item: unknown }>>(`/inventory/${id}`),

        create: (data: {
            name: string;
            code: string;
            category: string;
            unit: string;
            siteId: string;
            minimumStock?: number;
            maximumStock?: number;
            description?: string;
            specifications?: string;
            location?: string;
        }) => api.post<ApiResponse<{ item: unknown }>>("/inventory", data),

        update: (
            id: string,
            data: Partial<{
                name: string;
                minimumStock: number;
                maximumStock: number;
                description: string;
                specifications: string;
                location: string;
            }>,
        ) =>
            api.patch<ApiResponse<{ item: unknown }>>(`/inventory/${id}`, data),

        delete: (id: string) =>
            api.delete<ApiResponse<null>>(`/inventory/${id}`),

        addStock: (
            id: string,
            data: {
                type: "ADD" | "CONSUME";
                quantity: number;
                reason?: string;
                reference?: string;
                notes?: string;
            },
        ) =>
            api.post<ApiResponse<{ movement: unknown; item: unknown }>>(
                `/inventory/${id}/movement`,
                data,
            ),

        getHistory: (params?: {
            inventoryItemId?: string;
            siteId?: string;
            type?: string;
            startDate?: string;
            endDate?: string;
            page?: number;
            limit?: number;
        }) =>
            api.get<ApiResponse<{ movements: unknown[]; pagination: unknown }>>(
                "/inventory/history",
                { params },
            ),

        getItemHistory: (
            id: string,
            params?: { page?: number; limit?: number },
        ) =>
            api.get<ApiResponse<{ item: unknown; movements: unknown[] }>>(
                `/inventory/${id}/history`,
                { params },
            ),

        getLowStockAlerts: (params?: {
            siteId?: string;
            isRead?: boolean;
            severity?: string;
        }) =>
            api.get<
                ApiResponse<{
                    alerts: unknown[];
                    lowStockItems: unknown[];
                    unreadCount: number;
                }>
            >("/inventory/alerts/low-stock", { params }),

        markAlertRead: (id: string) =>
            api.patch<ApiResponse<null>>(`/inventory/alerts/${id}/read`),
    },

    // Health check
    health: () => api.get<ApiResponse<null>>("/health"),
};

export default api;
