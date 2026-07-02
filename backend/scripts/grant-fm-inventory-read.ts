import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * One-off: grant FRONT_MAN read-only inventory access (inventory:read:own).
 * The original seed omitted it, which 403'd the FM "Stock on Site" screen and
 * the request-form item-name suggestions. Idempotent — safe to re-run.
 */
async function main() {
    const role = await prisma.role.findUnique({ where: { name: "FRONT_MAN" } });
    if (!role) return console.log("FRONT_MAN role not found");

    const perm = await prisma.permission.findUnique({ where: { name: "inventory:read:own" } });
    if (!perm) return console.log("inventory:read:own permission not found");

    const already = await prisma.role.findFirst({
        where: { id: role.id, permissions: { some: { id: perm.id } } },
    });
    if (already) return console.log("FRONT_MAN already has inventory:read:own");

    await prisma.role.update({
        where: { id: role.id },
        data: { permissions: { connect: { id: perm.id } } },
    });
    console.log("Granted inventory:read:own to FRONT_MAN");
}

main().catch(console.error).finally(() => prisma.$disconnect());
