# IMS API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All protected endpoints require:

```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### POST /auth/login

Login and receive JWT token.

**Request:**

```json
{
    "email": "admin@ims.com",
    "password": "admin123"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "user": {
            "id": "uuid",
            "email": "admin@ims.com",
            "firstName": "System",
            "lastName": "Administrator",
            "role": "ADMIN"
        }
    }
}
```

### POST /auth/logout

Logout (client should discard token).

**Response:**

```json
{
    "success": true,
    "message": "Logged out successfully"
}
```

---

## 👥 User Management (Admin Only)

### GET /users

List all users.

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)
- `role` (optional)
- `search` (optional)

**Response:**

```json
{
    "success": true,
    "data": {
        "users": [
            {
                "id": "uuid",
                "email": "engineer@ims.com",
                "firstName": "Site",
                "lastName": "Engineer",
                "role": "SITE_ENGINEER",
                "isActive": true,
                "createdAt": "2024-01-15T10:00:00Z"
            }
        ],
        "pagination": {
            "total": 5,
            "page": 1,
            "pages": 1
        }
    }
}
```

### POST /users

Create new user.

**Request:**

```json
{
    "email": "newuser@ims.com",
    "password": "securepassword123",
    "firstName": "New",
    "lastName": "User",
    "role": "FRONT_MAN",
    "isActive": true
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "email": "newuser@ims.com",
        "role": "FRONT_MAN"
    }
}
```

### GET /users/:id

Get user by ID.

### PUT /users/:id

Update user.

**Request:**

```json
{
    "firstName": "Updated",
    "lastName": "Name",
    "role": "SITE_ENGINEER",
    "isActive": true
}
```

### DELETE /users/:id

Delete user.

---

## 🎭 Role Management (Admin Only)

### GET /roles

List all roles with permissions.

**Response:**

```json
{
    "success": true,
    "data": {
        "roles": [
            {
                "id": "uuid",
                "name": "ADMIN",
                "description": "System Administrator",
                "permissions": [
                    {
                        "id": "uuid",
                        "name": "users.read",
                        "resource": "users",
                        "action": "read"
                    }
                ]
            }
        ]
    }
}
```

### POST /roles

Create new role.

**Request:**

```json
{
    "name": "CUSTOM_ROLE",
    "description": "Custom role description",
    "permissionIds": ["uuid-1", "uuid-2"]
}
```

### PUT /roles/:id

Update role permissions.

**Request:**

```json
{
    "description": "Updated description",
    "permissionIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### DELETE /roles/:id

Delete role.

### GET /permissions

List all available permissions.

---

## 🏗️ Site Management

### GET /sites

List sites (role-dependent visibility).

**Response:**

```json
{
    "success": true,
    "data": {
        "sites": [
            {
                "id": "uuid",
                "name": "Downtown Tower",
                "code": "SITE-001",
                "address": "123 Main St",
                "projectManager": "John Smith",
                "status": "active"
            }
        ]
    }
}
```

### POST /sites (Admin Only)

Create new site.

**Request:**

```json
{
    "name": "New Construction Site",
    "code": "SITE-004",
    "address": "456 Oak Avenue",
    "projectManager": "Jane Doe",
    "status": "active"
}
```

### PUT /sites/:id (Admin Only)

Update site.

### DELETE /sites/:id (Admin Only)

Delete site.

---

## 📦 Request Management

### GET /requests

List requests (role-dependent).

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional)
- `siteId` (optional)
- `type` (optional)

**Response:**

```json
{
    "success": true,
    "data": {
        "requests": [
            {
                "id": "uuid",
                "requestNumber": "REQ-001",
                "type": "MATERIAL",
                "status": "PENDING",
                "priority": "normal",
                "description": "Cement needed for foundation",
                "site": {
                    "id": "uuid",
                    "name": "Downtown Tower",
                    "code": "SITE-001"
                },
                "requester": {
                    "id": "uuid",
                    "firstName": "Front",
                    "lastName": "Man"
                },
                "items": [
                    { "itemName": "Cement", "quantity": 100, "unit": "bags" }
                ],
                "createdAt": "2024-01-15T10:30:00Z"
            }
        ],
        "pagination": {
            "total": 10,
            "page": 1,
            "pages": 1
        }
    }
}
```

### POST /requests (FM Only)

Create new material/shifting request.

**Request:**

```json
{
    "type": "MATERIAL",
    "siteId": "uuid",
    "targetSiteId": "uuid (optional for SHIFTING)",
    "description": "Foundation materials needed",
    "justification": "Phase 2 construction",
    "expectedDate": "2024-01-20",
    "priority": "high",
    "items": [
        {
            "itemName": "Cement",
            "quantity": 500,
            "unit": "bags",
            "specifications": "Grade 53",
            "notes": "ASTM certified"
        }
    ]
}
```

### GET /requests/:id

Get request details with full history.

### PUT /requests/:id (FM Only)

Update own pending request.

### POST /requests/:id/approve

Approve request (role-specific).

**Request:**

```json
{
    "remarks": "Technical approval granted",
    "technicalRemarks": "Verified material specifications"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "status": "ENGINEER_APPROVED",
        "approvalAction": {
            "id": "uuid",
            "action": "approve",
            "fromStatus": "PENDING",
            "toStatus": "ENGINEER_APPROVED",
            "approverId": "uuid"
        }
    }
}
```

### POST /requests/:id/reject

Reject request (role-specific).

**Request:**

```json
{
    "remarks": "Insufficient budget allocation"
}
```

### POST /requests/:id/cancel (FM Only)

Cancel own pending request.

---

## 📊 Audit Logs (Admin Only)

### GET /audit/logs

List audit logs.

**Query Parameters:**

- `page` (default: 1)
- `limit` (default: 20)
- `action` (optional)
- `resource` (optional)
- `status` (optional)
- `userId` (optional)
- `startDate` (optional)
- `endDate` (optional)

**Response:**

```json
{
    "success": true,
    "data": {
        "logs": [
            {
                "id": "uuid",
                "user": {
                    "id": "uuid",
                    "email": "engineer@ims.com",
                    "firstName": "Site",
                    "lastName": "Engineer"
                },
                "action": "request.approve",
                "resource": "requests",
                "resourceId": "uuid",
                "details": "{\"fromStatus\": \"PENDING\", \"toStatus\": \"ENGINEER_APPROVED\"}",
                "ipAddress": "192.168.1.100",
                "status": "success",
                "createdAt": "2024-01-15T11:00:00Z"
            }
        ],
        "pagination": {
            "total": 100,
            "page": 1,
            "pages": 5
        }
    }
}
```

---

## 🚨 Error Responses

### 401 Unauthorized

```json
{
    "success": false,
    "error": "Authentication required",
    "code": "MISSING_TOKEN"
}
```

### 403 Forbidden

```json
{
    "success": false,
    "error": "Forbidden: Insufficient permissions",
    "code": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
    "success": false,
    "error": "Resource not found",
    "code": "NOT_FOUND"
}
```

### 400 Bad Request

```json
{
    "success": false,
    "error": "Validation error",
    "details": {
        "email": ["Invalid email format"],
        "password": ["Password must be at least 8 characters"]
    }
}
```

---

## 📝 Request Status Flow

```
PENDING → ENGINEER_APPROVED → PROCUREMENT_APPROVED → FINANCE_APPROVED → COMPLETED
    ↓           ↓                   ↓                    ↓
REJECTED      REJECTED           REJECTED           REJECTED
```

**Status Transitions:**

- PENDING: Only Site Engineer can approve/reject
- ENGINEER_APPROVED: Only Procurement can approve/reject
- PROCUREMENT_APPROVED: Only Finance can approve/reject
- FINANCE_APPROVED: Request completed
- Any rejection: Back to FM for revision

---

## 🔑 Role Permissions Summary

| Endpoint                   | Admin | Engineer     | Procurement     | Finance     | FM       |
| -------------------------- | ----- | ------------ | --------------- | ----------- | -------- |
| GET /users                 | ✅    | ❌           | ❌              | ❌          | ❌       |
| POST /users                | ✅    | ❌           | ❌              | ❌          | ❌       |
| GET /roles                 | ✅    | ❌           | ❌              | ❌          | ❌       |
| GET /sites                 | ✅    | ✅           | ❌              | ❌          | Assigned |
| POST /sites                | ✅    | ❌           | ❌              | ❌          | ❌       |
| GET /requests (own)        | ✅    | ✅           | ✅              | ✅          | ✅       |
| GET /requests (all)        | ✅    | ❌           | ❌              | ❌          | ❌       |
| POST /requests             | ❌    | ❌           | ❌              | ❌          | ✅       |
| PUT /requests/:id          | Owner | ❌           | ❌              | ❌          | Owner\*  |
| POST /requests/:id/approve | ✅    | Engineer\*\* | Procurement\*\* | Finance\*\* | ❌       |
| GET /audit/logs            | ✅    | ❌           | ❌              | ❌          | ❌       |

\*Only if PENDING status
\*\*Only for requests at their approval stage
