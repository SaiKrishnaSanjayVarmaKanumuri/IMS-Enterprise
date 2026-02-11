import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addSiteReadPermission() {
    // Find SUPPORT role
    const role = await prisma.role.findUnique({ where: { name: "SUPPORT" } });
    if (!role) {
        console.log("SUPPORT role not found");
        return;
    }

    // Find sites:read permission
    const perm = await prisma.permission.findUnique({
        where: { name: "sites:read" },
    });
    if (!perm) {
        console.log("sites:read permission not found");
        return;
    }

    // Check if already connected
    const hasPerm = await prisma.role.findFirst({
        where: {
            id: role.id,
            permissions: { some: { id: perm.id } },
        },
    });

    if (hasPerm) {
        console.log("SUPPORT role already has sites:read permission");
        return;
    }

    // Add permission
    await prisma.role.update({
        where: { id: role.id },
        data: {
            permissions: {
                connect: { id: perm.id },
            },
        },
    });

    console.log("Added sites:read permission to SUPPORT role");
}

addSiteReadPermission()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
