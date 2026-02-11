// User Role Types (Admin-defined only)
export type UserRole =
    | "ADMIN"
    | "SITE_ENGINEER"
    | "PROCUREMENT"
    | "FINANCE"
    | "FRONT_MAN";

export interface Role {
    id: string;
    name: UserRole;
    description: string;
    permissions?: Permission[];
    userCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Permission {
    id: string;
    name: string;
    resource: string;
    action: string;
    description: string;
}

// User Types
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    roleDescription?: string;
    permissions?: string[];
    isActive: boolean;
    assignedSites?: Site[];
    createdAt: string;
}

// Site Types
export interface Site {
    id: string;
    name: string;
    code: string;
    address: string;
    projectManager?: string;
    status: string;
    assignedUsers?: User[];
    requestCount?: number;
    createdAt: string;
    updatedAt: string;
}

// Request Types
export type RequestStatus =
    | "PENDING"
    | "ENGINEER_APPROVED"
    | "ENGINEER_REJECTED"
    | "PROCUREMENT_APPROVED"
    | "PROCUREMENT_REJECTED"
    | "FINANCE_APPROVED"
    | "FINANCE_REJECTED"
    | "COMPLETED"
    | "CANCELLED";

export type RequestType = "MATERIAL" | "SHIFTING";

export interface RequestItem {
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    specifications?: string;
    notes?: string;
}

export interface Request {
    id: string;
    requestNumber: string;
    type: RequestType;
    status: RequestStatus;
    priority: string;
    requesterId: string;
    requester?: User;
    siteId: string;
    site?: Site;
    targetSiteId?: string;
    targetSite?: Site;
    description: string;
    justification?: string;
    expectedDate?: string;
    estimatedCost?: number;
    actualCost?: number;
    budgetCode?: string;
    vendorId?: string;
    vendorName?: string;
    poNumber?: string;
    procurementNotes?: string;
    financeNotes?: string;
    items: RequestItem[];
    approvalActions?: ApprovalAction[];
    createdAt: string;
    updatedAt: string;
}

export interface ApprovalAction {
    id: string;
    requestId: string;
    approverId: string;
    approver?: User;
    action: "approve" | "reject" | "cancel";
    fromStatus: RequestStatus;
    toStatus: RequestStatus;
    remarks?: string;
    createdAt: string;
}

// Audit Log Types
export interface AuditLog {
    id: string;
    userId?: string;
    user?: User;
    requestId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    siteId?: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    status: "success" | "failed";
    errorMessage?: string;
    createdAt: string;
}

// ============================================
// INVENTORY TYPES
// ============================================

export type StockMovementType = "ADD" | "CONSUME";

export interface InventoryItem {
    id: string;
    name: string;
    code: string;
    category: string;
    unit: string;
    currentStock: number;
    minimumStock: number;
    maximumStock?: number;
    siteId: string;
    site?: {
        id: string;
        name: string;
        code: string;
    };
    description?: string;
    specifications?: string;
    location?: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        movements: number;
        alerts: number;
    };
}

export interface StockMovement {
    id: string;
    type: StockMovementType;
    quantity: number;
    previousStock: number;
    newStock: number;
    inventoryItemId: string;
    inventoryItem?: {
        id: string;
        name: string;
        code: string;
        unit: string;
    };
    performedById: string;
    performedBy?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    siteId: string;
    site?: {
        id: string;
        name: string;
        code: string;
    };
    reason?: string;
    reference?: string;
    notes?: string;
    createdAt: string;
}

export interface Alert {
    id: string;
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    inventoryItemId: string;
    inventoryItem?: {
        id: string;
        name: string;
        code: string;
        unit: string;
        currentStock: number;
        minimumStock: number;
        site?: {
            id: string;
            name: string;
            code: string;
        };
    };
    isRead: boolean;
    isActive: boolean;
    createdAt: string;
    resolvedAt?: string;
}

export interface LowStockData {
    items: InventoryItem[];
    totalBelow: number;
}

// Create Inventory Item Form
export interface CreateInventoryForm {
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
}

// Stock Movement Form
export interface StockMovementForm {
    type: StockMovementType;
    quantity: number;
    reason?: string;
    reference?: string;
    notes?: string;
}

// Inventory Filter
export interface InventoryFilter {
    siteId?: string;
    category?: string;
    search?: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
    message?: string;
    details?: unknown[];
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Login Form
export interface LoginForm {
    email: string;
    password: string;
}

// Create User Form
export interface CreateUserForm {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    password: string;
    siteIds?: string[];
}

// Create Request Form
export interface CreateRequestForm {
    type: RequestType;
    siteId: string;
    targetSiteId?: string;
    description: string;
    justification?: string;
    expectedDate?: string;
    priority?: string;
    items: {
        itemName: string;
        quantity: number;
        unit: string;
        specifications?: string;
        notes?: string;
    }[];
}

// Create Site Form
export interface CreateSiteForm {
    name: string;
    code: string;
    address: string;
    projectManager?: string;
    status?: string;
    userIds?: string[];
}

// Inventory categories
export const INVENTORY_CATEGORIES = [
    { value: "raw_materials", label: "Raw Materials" },
    { value: "tools", label: "Tools" },
    { value: "equipment", label: "Equipment" },
    { value: "safety_gear", label: "Safety Gear" },
    { value: "consumables", label: "Consumables" },
    { value: "other", label: "Other" },
];

// Stock movement reasons
export const MOVEMENT_REASONS = [
    { value: "delivery", label: "Delivery" },
    { value: "purchase", label: "Purchase" },
    { value: "construction_use", label: "Construction Use" },
    { value: "damaged", label: "Damaged/Lost" },
    { value: "transfer", label: "Transfer" },
    { value: "return", label: "Return to Supplier" },
    { value: "adjustment", label: "Stock Adjustment" },
    { value: "other", label: "Other" },
];

// Role Permissions Matrix
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    ADMIN: ["*"],
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

// Role Display Names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
    ADMIN: "Administrator",
    SITE_ENGINEER: "Site Engineer",
    PROCUREMENT: "Procurement Team",
    FINANCE: "Finance Team",
    FRONT_MAN: "Front Man",
};

// Request Status Display Names
export const STATUS_DISPLAY_NAMES: Record<RequestStatus, string> = {
    PENDING: "Pending Engineer Approval",
    ENGINEER_APPROVED: "Approved by Engineer",
    ENGINEER_REJECTED: "Rejected by Engineer",
    PROCUREMENT_APPROVED: "Approved by Procurement",
    PROCUREMENT_REJECTED: "Rejected by Procurement",
    FINANCE_APPROVED: "Approved by Finance",
    FINANCE_REJECTED: "Rejected by Finance",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

// Status Colors for UI
export const STATUS_COLORS: Record<RequestStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    ENGINEER_APPROVED: "bg-blue-100 text-blue-800",
    ENGINEER_REJECTED: "bg-red-100 text-red-800",
    PROCUREMENT_APPROVED: "bg-indigo-100 text-indigo-800",
    PROCUREMENT_REJECTED: "bg-red-100 text-red-800",
    FINANCE_APPROVED: "bg-green-100 text-green-800",
    FINANCE_REJECTED: "bg-red-100 text-red-800",
    COMPLETED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-gray-100 text-gray-800",
};
