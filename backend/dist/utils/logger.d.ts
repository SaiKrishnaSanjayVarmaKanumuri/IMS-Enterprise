import winston from "winston";
export declare const logger: winston.Logger;
export declare const auditLogger: winston.Logger;
export declare const logAudit: (userId: string | null, action: string, resource: string, resourceId?: string, details?: Record<string, unknown>, status?: "success" | "failed", errorMessage?: string) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map