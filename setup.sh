#!/bin/bash

# IMS - Construction Inventory Management System Setup Script
# This script installs dependencies and sets up the project

echo "🏗️  IMS - Construction Inventory Management System"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

print_status "Node.js version: $(node --version)"

# Setup Backend
echo ""
echo "📦 Setting up Backend..."
echo "------------------------"

cd backend

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
else
    print_status "Backend dependencies already installed"
fi

# Generate Prisma client
npx prisma generate
print_status "Prisma client generated"

# Run database migrations
npx prisma migrate dev --name init
print_status "Database migrations completed"

# Seed the database
npx tsx prisma/seed.ts
print_status "Database seeded with default data"

cd ..

# Setup Frontend
echo ""
echo "🎨 Setting up Frontend..."
echo "-------------------------"

cd frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
else
    print_status "Frontend dependencies already installed"
fi

cd ..

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "📋 Default Credentials:"
echo "   Admin:        admin@ims.com / admin123"
echo "   Engineer:     engineer@ims.com / engineer123"
echo "   Procurement:  procurement@ims.com / procurement123"
echo "   Finance:      finance@ims.com / finance123"
echo "   Front Man:    fm@ims.com / fm123"
echo ""
echo "🚀 To start the application:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "📝 Open in browser: http://localhost:5173"


