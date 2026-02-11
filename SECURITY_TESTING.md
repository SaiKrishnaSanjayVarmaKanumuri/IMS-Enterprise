# Security Architecture & Testing Guide

## 🔐 Security Features Implemented

### 1. JWT Token Validation (Backend)

**Authentication Middleware** (`src/middleware/auth.ts`):

- Validates JWT token on every protected request
- Attaches user info to request object
- Handles token expiration and invalid tokens
- Logs authentication failures

```typescript
// Token verification flow
Header: Authorization: Bearer <token>
        ↓
Middleware extracts token
        ↓
jwt.verify(token, SECRET)
        ↓
Attach user to req.user
        ↓
Next middleware/route
```

### 2. Role-Based Access Control (RBAC)

**Permission System** (`src/middleware/rbac.ts`):

- Granular permissions per role
- Resource-based access (requests, users, sites, etc.)
- Action-based permissions (create, read, approve, etc.)
- Admin-only routes blocked for non-admins

**Permission Matrix**:

| Role        | Users | Roles | Sites    | Requests | Approve     | Audit |
| ----------- | ----- | ----- | -------- | -------- | ----------- | ----- |
| Admin       | ✅    | ✅    | ✅       | ✅       | ✅          | ✅    |
| Engineer    | ❌    | ❌    | Read     | Create   | Engineer    | ❌    |
| Procurement | ❌    | ❌    | ❌       | Read     | Procurement | ❌    |
| Finance     | ❌    | ❌    | ❌       | Read     | Finance     | ❌    |
| Front Man   | ❌    | ❌    | Assigned | Create   | ❌          | ❌    |

### 3. Frontend Route Protection

**ProtectedRoute Component**:

- Checks authentication before rendering
- Validates user role against allowed roles
- Redirects unauthorized users
- Hides UI elements based on role

```typescript
// Route protection flow
User accesses protected route
        ↓
ProtectedRoute checks auth
        ↓
If not authenticated → Redirect to /login
        ↓
If authenticated but wrong role → Redirect to dashboard
        ↓
Render component
```

### 4. Audit Logging

**Logged Actions**:

- Authentication (login, logout, token issues)
- Request operations (create, update, approve, reject)
- User management (create, update, delete)
- Role management (create, update, delete)
- Site management (create, update, delete)
- Unauthorized access attempts

**Log Entry Structure**:

```json
{
    "id": "uuid",
    "userId": "user-uuid",
    "action": "request.approve",
    "resource": "requests",
    "resourceId": "request-uuid",
    "details": "{\"fromStatus\": \"PENDING\", \"toStatus\": \"ENGINEER_APPROVED\"}",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "status": "success",
    "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 🧪 Testing Guide

### 1. JWT Token Validation Testing

```bash
# Test with valid token
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/requests

# Test without token (should return 401)
curl http://localhost:3000/api/requests
# Expected: {"success":false,"error":"Authentication required"}

# Test with invalid token (should return 401)
curl -H "Authorization: Bearer invalid-token" http://localhost:3000/api/requests
# Expected: {"success":false,"error":"Invalid token"}
```

### 2. Role-Based Access Testing

```bash
# Login as Front Man
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fm@ims.com","password":"fm123"}'

# Try to access admin-only endpoint (should return 403)
FM_TOKEN=$(cat token.json | jq -r '.token')
curl -H "Authorization: Bearer $FM_TOKEN" \
  http://localhost:3000/api/users
# Expected: {"success":false,"error":"Forbidden: Insufficient permissions"}
```

### 3. Approval Workflow Testing

```bash
# 1. FM creates request
FM_TOKEN=$(cat token.json | jq -r '.token')
curl -X POST http://localhost:3000/api/requests \
  -H "Authorization: Bearer $FM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MATERIAL",
    "siteId": "site-uuid",
    "description": "Cement bags needed",
    "items": [{"itemName": "Cement", "quantity": 100, "unit": "bags"}]
  }'

# 2. Engineer approves request
ENGINEER_TOKEN=$(cat engineer_token.json | jq -r '.token')
curl -X POST http://localhost:3000/api/requests/<request-id>/approve \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Approved for construction"}'

# 3. Procurement assigns vendor
PROCUREMENT_TOKEN=$(cat procurement_token.json | jq -r '.token')
curl -X POST http://localhost:3000/api/requests/<request-id>/approve \
  -H "Authorization: Bearer $PROCUREMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Vendor assigned", "vendorName": "ABC Supplies"}'

# 4. Finance approves
FINANCE_TOKEN=$(cat finance_token.json | jq -r '.token')
curl -X POST http://localhost:3000/api/requests/<request-id>/approve \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Budget approved"}'
```

### 4. Security Vulnerability Testing

```bash
# Test: SQL Injection prevention
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ims.com\' OR \'1\'=\'1","password":"anything"}'
# Should reject - not authenticate

# Test: XSS prevention (request description)
FM_TOKEN=$(cat token.json | jq -r '.token')
curl -X POST http://localhost:3000/api/requests \
  -H "Authorization: Bearer $FM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"MATERIAL","siteId":"site-uuid","description":"<script>alert(1)</script>","items":[]}'

# Test: Role manipulation prevention
FM tries to modify their own role via API
curl -X PATCH http://localhost:3000/api/users/<fm-id> \
  -H "Authorization: Bearer $FM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"ADMIN"}'
# Should return 403 Forbidden
```

### 5. Audit Log Verification

```bash
# View all audit logs (Admin only)
ADMIN_TOKEN=$(cat admin_token.json | jq -r '.token')
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/audit/logs

# Filter by action
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/audit/logs?action=request.approve"

# Filter by user
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/audit/logs?userId=<user-uuid>"
```

---

## 🔒 Security Checklist

- [x] JWT tokens expire after 24 hours
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] No role configuration access for non-admins
- [x] All API endpoints protected with auth middleware
- [x] Role verification on sensitive operations
- [x] Audit logging for all actions
- [x] Input validation with Zod schemas
- [x] CORS configuration
- [x] Rate limiting on auth endpoints
- [x] Environment variables for secrets

---

## 📋 End-to-End Testing Workflow

1. **Admin Setup**
    - [ ] Login as admin
    - [ ] Create sites
    - [ ] Create users with roles
    - [ ] Verify audit logs

2. **FM Workflow**
    - [ ] Login as FM
    - [ ] Create material request
    - [ ] View own requests
    - [ ] Verify engineer sees request

3. **Engineer Workflow**
    - [ ] Login as engineer
    - [ ] See pending requests
    - [ ] Approve/reject request
    - [ ] Add remarks

4. **Procurement Workflow**
    - [ ] Login as procurement
    - [ ] See engineer-approved requests
    - [ ] Assign vendor
    - [ ] Create PO

5. **Finance Workflow**
    - [ ] Login as finance
    - [ ] See procurement-approved requests
    - [ ] Review cost
    - [ ] Financial approval

6. **Security Verification**
    - [ ] Test unauthorized access
    - [ ] Verify role restrictions
    - [ ] Check audit logs
    - [ ] Test token expiration
