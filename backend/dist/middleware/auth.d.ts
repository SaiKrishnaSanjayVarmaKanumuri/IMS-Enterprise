import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}
interface JwtPayload {
    id: string;
    email: string;
    role: string;
}
/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Generate JWT token for user
 */
export declare const generateToken: (user: {
    id: string;
    email: string;
    role: string;
}) => string;
/**
 * Verify JWT token without middleware
 */
export declare const verifyToken: (token: string) => JwtPayload | null;
export {};
//# sourceMappingURL=auth.d.ts.map