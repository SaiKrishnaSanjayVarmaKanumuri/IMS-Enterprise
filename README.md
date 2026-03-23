# IMS - Construction Inventory Management System

## Project Overview

A comprehensive construction inventory management system with strict, admin-controlled role-based access control (RBAC).

## Tech Stack

- **Backend**: Express.js + TypeScript + Prisma ORM
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite (for development) / PostgreSQL (for production)
- **Authentication**: JWT with strict role-based access

## Roles (Admin-Defined Only)

1. **Admin** - Full system access
2. **Site Engineer** - Approve/reject requests, add remarks
3. **Procurement Team** - Vendor assignment, PO creation
4. **Finance Team** - Financial approval
5. **Front Man (FM)** - Raise material/shifting requests

## Approval Workflow

FM → Site Engineer → Procurement → Finance → Admin (override only)

## 🚀 Setup and Run Instructions

### 1. Initial Setup (One-time)

```bash
cd /Users/vijayvarma/Downloads/IMS
./setup.sh
```

This installs dependencies, generates Prisma client, runs migrations, and seeds the database.

### 2. Start Servers (New terminals)

**Terminal 1 - Backend:**

```bash
cd /Users/vijayvarma/Downloads/IMS/backend
npm run dev
```

- Runs on **http://localhost:3000/api**
- Hot reload enabled

**Terminal 2 - Frontend:**

```bash
cd /Users/vijayvarma/Downloads/IMS/frontend
npm run dev
```

- Runs on **http://localhost:5173/**
- Hot reload enabled

### 3. Open Application

```bash
open http://localhost:5173
```

## Default Credentials (Seeded)

| Role          | Email               | Password       |
| ------------- | ------------------- | -------------- |
| Admin         | admin@ims.com       | admin123       |
| Site Engineer | engineer@ims.com    | engineer123    |
| Procurement   | procurement@ims.com | procurement123 |
| Finance       | finance@ims.com     | finance123     |
| Front Man     | fm@ims.com          | fm123          |

## Security Features

- JWT authentication
- Role-based middleware
- API authorization
- Audit logging
- No user role configuration access

## Development Notes

- Backend uses `tsx watch` for hot reload
- Frontend uses Vite for fast HMR

## 🐳 Docker Deployment

For a production-ready setup using Docker:

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your secrets
   ```

2. **Build and Start**:
   ```bash
   docker compose up -d --build
   ```

3. **Database Setup** (inside container):
   ```bash
   docker exec -it ims-backend npx prisma migrate deploy
   docker exec -it ims-backend npm run seed
   ```

The application will be available at:
- Frontend: [http://localhost](http://localhost)
- Backend API: [http://localhost:3000/api](http://localhost:3000/api)
- Health Check: [http://localhost:3000/health](http://localhost:3000/health)

## 🏗️ Technical Enhancements (Topnotch)

- **Centralized Error Handling**: Custom `AppError` class and global middleware.
- **Security**: Helmet, CORS, and Rate Limiting configured for production.
- **Performance**: Gzip compression implemented on the backend.
- **Robustness**: Global React Error Boundary to handle runtime UI failures.
- **Architecture**: Decoupled configuration using environment variables.

