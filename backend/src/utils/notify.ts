import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

const prisma = new PrismaClient();

interface NotifyPayload {
    type: string; // "REQUEST_CREATED", "REQUEST_APPROVED", "REQUEST_REJECTED", "LOW_STOCK", ...
    title: string;
    message: string;
    link?: string;
}

/**
 * Create in-app notifications for a set of users. Best-effort: never throws, so
 * a notification failure can't break the business action that triggered it.
 */
export async function notifyUsers(
    userIds: (string | null | undefined)[],
    payload: NotifyPayload,
): Promise<void> {
    const unique = Array.from(new Set(userIds)).filter(
        (id): id is string => !!id,
    );
    if (unique.length === 0) return;
    try {
        await prisma.notification.createMany({
            data: unique.map((userId) => ({
                userId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                link: payload.link,
            })),
        });
    } catch (error) {
        logger.error("notifyUsers failed:", error);
    }
}

/** Active user ids for a role (used for role-wide notifications). */
export async function getActiveUserIdsByRole(role: string): Promise<string[]> {
    try {
        const users = await prisma.user.findMany({
            where: { role, isActive: true },
            select: { id: true },
        });
        return users.map((u) => u.id);
    } catch (error) {
        logger.error("getActiveUserIdsByRole failed:", error);
        return [];
    }
}

/** Active site engineers assigned to a given site. */
export async function getSiteEngineerIds(siteId: string): Promise<string[]> {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: "SITE_ENGINEER",
                isActive: true,
                assignedSites: { some: { id: siteId } },
            },
            select: { id: true },
        });
        return users.map((u) => u.id);
    } catch (error) {
        logger.error("getSiteEngineerIds failed:", error);
        return [];
    }
}
