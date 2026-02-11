import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Role constants (matching schema)
const ROLES = {
    ADMIN: "ADMIN",
    SITE_ENGINEER: "SITE_ENGINEER",
    PROCUREMENT: "PROCUREMENT",
    FINANCE: "FINANCE",
    FRONT_MAN: "FRONT_MAN",
} as const;

async function main() {
    console.log("🌱 Seeding database...");

    // Create Permissions
    const permissions = [
        // Wildcard permission for Admin (grants all access)
        {
            name: "*",
            resource: "*",
            action: "*",
            description: "Full system access - Admin only",
        },
        {
            name: "auth:login",
            resource: "auth",
            action: "login",
            description: "Login to system",
        },
        {
            name: "users:read",
            resource: "users",
            action: "read",
            description: "View users",
        },
        {
            name: "users:create",
            resource: "users",
            action: "create",
            description: "Create users",
        },
        {
            name: "users:update",
            resource: "users",
            action: "update",
            description: "Update users",
        },
        {
            name: "users:delete",
            resource: "users",
            action: "delete",
            description: "Delete users",
        },
        {
            name: "users:assign-role",
            resource: "users",
            action: "assign-role",
            description: "Assign roles to users",
        },
        {
            name: "roles:read",
            resource: "roles",
            action: "read",
            description: "View roles",
        },
        {
            name: "roles:create",
            resource: "roles",
            action: "create",
            description: "Create roles",
        },
        {
            name: "roles:update",
            resource: "roles",
            action: "update",
            description: "Update roles",
        },
        {
            name: "roles:delete",
            resource: "roles",
            action: "delete",
            description: "Delete roles",
        },
        {
            name: "roles:assign-permissions",
            resource: "roles",
            action: "assign-permissions",
            description: "Assign permissions to roles",
        },
        {
            name: "sites:read",
            resource: "sites",
            action: "read",
            description: "View sites",
        },
        {
            name: "sites:create",
            resource: "sites",
            action: "create",
            description: "Create sites",
        },
        {
            name: "sites:update",
            resource: "sites",
            action: "update",
            description: "Update sites",
        },
        {
            name: "sites:delete",
            resource: "sites",
            action: "delete",
            description: "Delete sites",
        },
        {
            name: "requests:create",
            resource: "requests",
            action: "create",
            description: "Create requests",
        },
        {
            name: "requests:read:own",
            resource: "requests",
            action: "read:own",
            description: "View own requests",
        },
        {
            name: "requests:read:all",
            resource: "requests",
            action: "read:all",
            description: "View all requests",
        },
        {
            name: "requests:read:approval",
            resource: "requests",
            action: "read:approval",
            description: "View requests pending approval",
        },
        {
            name: "requests:update",
            resource: "requests",
            action: "update",
            description: "Update requests",
        },
        {
            name: "requests:delete",
            resource: "requests",
            action: "delete",
            description: "Delete requests",
        },
        {
            name: "requests:cancel",
            resource: "requests",
            action: "cancel",
            description: "Cancel requests",
        },
        {
            name: "requests:approve:engineer",
            resource: "requests",
            action: "approve:engineer",
            description: "Approve as Site Engineer",
        },
        {
            name: "requests:approve:procurement",
            resource: "requests",
            action: "approve:procurement",
            description: "Approve as Procurement",
        },
        {
            name: "requests:approve:finance",
            resource: "requests",
            action: "approve:finance",
            description: "Approve as Finance",
        },
        {
            name: "requests:approve:admin",
            resource: "requests",
            action: "approve:admin",
            description: "Admin override approval",
        },
        {
            name: "requests:reject:engineer",
            resource: "requests",
            action: "reject:engineer",
            description: "Reject as Site Engineer",
        },
        {
            name: "requests:reject:procurement",
            resource: "requests",
            action: "reject:procurement",
            description: "Reject as Procurement",
        },
        {
            name: "requests:reject:finance",
            resource: "requests",
            action: "reject:finance",
            description: "Reject as Finance",
        },
        {
            name: "requests:reject:admin",
            resource: "requests",
            action: "reject:admin",
            description: "Admin override rejection",
        },
        {
            name: "procurement:assign-vendor",
            resource: "procurement",
            action: "assign-vendor",
            description: "Assign vendor to request",
        },
        {
            name: "procurement:create-po",
            resource: "procurement",
            action: "create-po",
            description: "Create purchase order",
        },
        {
            name: "procurement:update-delivery",
            resource: "procurement",
            action: "update-delivery",
            description: "Update delivery status",
        },
        {
            name: "finance:review-cost",
            resource: "finance",
            action: "review-cost",
            description: "Review cost and budget",
        },
        {
            name: "finance:approve-budget",
            resource: "finance",
            action: "approve-budget",
            description: "Approve budget allocation",
        },
        {
            name: "audit:read",
            resource: "audit",
            action: "read",
            description: "View audit logs",
        },
        {
            name: "audit:export",
            resource: "audit",
            action: "export",
            description: "Export audit logs",
        },
        // Inventory permissions
        {
            name: "inventory:read:own",
            resource: "inventory",
            action: "read:own",
            description: "View inventory at assigned sites",
        },
        {
            name: "inventory:read:all",
            resource: "inventory",
            action: "read:all",
            description: "View inventory at all sites",
        },
        {
            name: "inventory:create",
            resource: "inventory",
            action: "create",
            description: "Create inventory items",
        },
        {
            name: "inventory:update",
            resource: "inventory",
            action: "update",
            description: "Update inventory items",
        },
        {
            name: "inventory:delete",
            resource: "inventory",
            action: "delete",
            description: "Delete inventory items",
        },
        {
            name: "inventory:movement",
            resource: "inventory",
            action: "movement",
            description: "Add or consume stock",
        },
    ];

    console.log("Creating permissions...");
    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { name: perm.name },
            update: {},
            create: perm,
        });
    }

    // Create Roles
    console.log("Creating roles...");

    // Create Admin role
    const adminRole = await prisma.role.upsert({
        where: { name: ROLES.ADMIN },
        update: {},
        create: {
            name: ROLES.ADMIN,
            description: "System Administrator - Full access",
        },
    });

    const allPerms = await prisma.permission.findMany();
    await prisma.role.update({
        where: { id: adminRole.id },
        data: { permissions: { connect: allPerms.map((p) => ({ id: p.id })) } },
    });

    // Create Site Engineer role
    const engineerRole = await prisma.role.upsert({
        where: { name: ROLES.SITE_ENGINEER },
        update: {},
        create: {
            name: ROLES.SITE_ENGINEER,
            description:
                "Site Engineer - Approve/reject requests at site level",
        },
    });

    const engineerPerms = await prisma.permission.findMany({
        where: {
            name: {
                in: [
                    "auth:login",
                    "sites:read",
                    "requests:read:own",
                    "requests:read:approval",
                    "requests:update",
                    "requests:approve:engineer",
                    "requests:reject:engineer",
                ],
            },
        },
    });
    await prisma.role.update({
        where: { id: engineerRole.id },
        data: {
            permissions: { connect: engineerPerms.map((p) => ({ id: p.id })) },
        },
    });

    // Create Procurement role
    const procurementRole = await prisma.role.upsert({
        where: { name: ROLES.PROCUREMENT },
        update: {},
        create: {
            name: ROLES.PROCUREMENT,
            description: "Procurement Team - Vendor assignment and PO creation",
        },
    });

    const procurementPerms = await prisma.permission.findMany({
        where: {
            name: {
                in: [
                    "auth:login",
                    "requests:read:approval",
                    "requests:approve:procurement",
                    "requests:reject:procurement",
                    "procurement:assign-vendor",
                    "procurement:create-po",
                    "procurement:update-delivery",
                ],
            },
        },
    });
    await prisma.role.update({
        where: { id: procurementRole.id },
        data: {
            permissions: {
                connect: procurementPerms.map((p) => ({ id: p.id })),
            },
        },
    });

    // Create Finance role
    const financeRole = await prisma.role.upsert({
        where: { name: ROLES.FINANCE },
        update: {},
        create: {
            name: ROLES.FINANCE,
            description: "Finance Team - Financial approval and budget review",
        },
    });

    const financePerms = await prisma.permission.findMany({
        where: {
            name: {
                in: [
                    "auth:login",
                    "requests:read:approval",
                    "requests:approve:finance",
                    "requests:reject:finance",
                    "finance:review-cost",
                    "finance:approve-budget",
                ],
            },
        },
    });
    await prisma.role.update({
        where: { id: financeRole.id },
        data: {
            permissions: { connect: financePerms.map((p) => ({ id: p.id })) },
        },
    });

    // Create Front Man role
    const fmRole = await prisma.role.upsert({
        where: { name: ROLES.FRONT_MAN },
        update: {},
        create: {
            name: ROLES.FRONT_MAN,
            description: "Front Man - Raise material/shifting requests",
        },
    });

    const fmPerms = await prisma.permission.findMany({
        where: {
            name: {
                in: [
                    "auth:login",
                    "sites:read",
                    "requests:create",
                    "requests:read:own",
                    "requests:update",
                    "requests:cancel",
                ],
            },
        },
    });
    await prisma.role.update({
        where: { id: fmRole.id },
        data: { permissions: { connect: fmPerms.map((p) => ({ id: p.id })) } },
    });

    // Create default Admin user
    console.log("Creating admin user...");
    const adminPasswordHash = await bcrypt.hash("admin123", 12);

    await prisma.user.upsert({
        where: { email: "admin@ims.com" },
        update: {},
        create: {
            email: "admin@ims.com",
            passwordHash: adminPasswordHash,
            firstName: "System",
            lastName: "Administrator",
            role: ROLES.ADMIN,
            isActive: true,
        },
    });

    // Create sample sites
    console.log("Creating sample sites...");
    const sites = await Promise.all([
        prisma.site.upsert({
            where: { code: "SITE-001" },
            update: {},
            create: {
                name: "Downtown Tower Project",
                code: "SITE-001",
                address: "123 Main Street, Downtown",
                projectManager: "John Smith",
                status: "active",
            },
        }),
        prisma.site.upsert({
            where: { code: "SITE-002" },
            update: {},
            create: {
                name: "Riverside Complex",
                code: "SITE-002",
                address: "456 River Road, Riverside",
                projectManager: "Jane Doe",
                status: "active",
            },
        }),
        prisma.site.upsert({
            where: { code: "SITE-003" },
            update: {},
            create: {
                name: "Industrial Park Phase 1",
                code: "SITE-003",
                address: "789 Industrial Blvd, Zone A",
                projectManager: "Mike Johnson",
                status: "active",
            },
        }),
    ]);

    // Create sample users
    console.log("Creating sample users...");
    const sampleUsers = [
        {
            email: "engineer@ims.com",
            firstName: "Site",
            lastName: "Engineer",
            role: ROLES.SITE_ENGINEER,
            password: "engineer123",
        },
        {
            email: "procurement@ims.com",
            firstName: "Procurement",
            lastName: "Manager",
            role: ROLES.PROCUREMENT,
            password: "procurement123",
        },
        {
            email: "finance@ims.com",
            firstName: "Finance",
            lastName: "Officer",
            role: ROLES.FINANCE,
            password: "finance123",
        },
        {
            email: "fm@ims.com",
            firstName: "Front",
            lastName: "Man",
            role: ROLES.FRONT_MAN,
            password: "fm123",
        },
    ];

    for (const user of sampleUsers) {
        const passwordHash = await bcrypt.hash(user.password, 12);
        await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                email: user.email,
                passwordHash,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: true,
            },
        });
    }

    console.log("✅ Database seeded successfully!");
    console.log("\n📋 Default Credentials:");
    console.log("  Admin: admin@ims.com / admin123");
    console.log("  Engineer: engineer@ims.com / engineer123");
    console.log("  Procurement: procurement@ims.com / procurement123");
    console.log("  Finance: finance@ims.com / finance123");
    console.log("  Front Man: fm@ims.com / fm123");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
