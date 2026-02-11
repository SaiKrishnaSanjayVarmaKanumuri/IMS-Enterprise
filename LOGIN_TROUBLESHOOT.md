# Login Issue Diagnosis & Fix Plan

## Information Gathered

The IMS application has a complete authentication system:

- **Backend**: Express.js + TypeScript + Prisma ORM + JWT
- **Frontend**: React + Vite + Axios
- **Database**: SQLite (dev) / PostgreSQL (prod)

**Login Flow:**

1. Frontend sends POST to `/api/auth/login`
2. Backend validates credentials, checks password hash
3. Backend generates JWT token and returns user data
4. Frontend stores token in localStorage
5. All subsequent requests include Bearer token

**Demo Credentials (from seed):**

- Admin: admin@ims.com / admin123
- Engineer: engineer@ims.com / engineer123
- Procurement: procurement@ims.com / procurement123
- Finance: finance@ims.com / finance123
- Front Man: fm@ims.com / fm123

## Common Login Issues & Solutions

### Issue 1: Backend Server Not Running

**Symptoms:** Network error, cannot connect to server

### Issue 2: Database Not Seeded

**Symptoms:** "Invalid email or password" even with correct credentials

### Issue 3: CORS Issues

**Symptoms:** Request blocked by CORS policy

### Issue 4: Wrong API URL Configuration

**Symptoms:** Requests going to wrong endpoint

### Issue 5: JWT Secret Issues

**Symptoms:** Token errors or authentication failures

## Diagnostic Steps

### Step 1: Check if backend server is running

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{"success":true,"message":"IMS API is running",...}
```

### Step 2: Check database seeding

Verify users exist in database:

```bash
cd backend && npx prisma studio
```

### Step 3: Test login API directly

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ims.com","password":"admin123"}'
```

## Fix Plan

1. **Start Backend Server** (if not running)
2. **Seed Database** (if users don't exist)
3. **Verify API URL** in frontend
4. **Check CORS Configuration**
5. **Test with direct API call**

## Commands to Run

### Start Backend

```bash
cd backend && npm run dev
```

### Seed Database

```bash
cd backend && npx prisma migrate dev && npx tsx prisma/seed.ts
```

### Start Frontend

```bash
cd frontend && npm run dev
```

### Test Login API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ims.com","password":"admin123"}'
```
