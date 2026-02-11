import { Request, Response } from "express";
/**
 * Login Controller
 * Authenticates users and returns JWT token
 *
 * IMPORTANT: No self-signup. Only Admin can create user accounts.
 */
export declare const login: (req: Request, res: Response) => Promise<void>;
/**
 * Get Current User Info
 */
export declare const me: (req: Request, res: Response) => Promise<void>;
/**
 * Change Password
 */
export declare const changePassword: (req: Request, res: Response) => Promise<void>;
/**
 * Logout - Client-side token removal, but we log it
 */
export declare const logout: (req: Request, res: Response) => Promise<void>;
declare const _default: {
    login: (req: Request, res: Response) => Promise<void>;
    me: (req: Request, res: Response) => Promise<void>;
    changePassword: (req: Request, res: Response) => Promise<void>;
    logout: (req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=authController.d.ts.map