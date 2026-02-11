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

## Setup Instructions

1. Backend: `cd backend && npm install && npx prisma migrate dev`
2. Frontend: `cd frontend && npm install`
3. Run backend: `npm run dev`
4. Run frontend: `npm run dev`

## Security Features

- JWT authentication
- Role-based middleware
- API authorization
- Audit logging
- No user role configuration access
