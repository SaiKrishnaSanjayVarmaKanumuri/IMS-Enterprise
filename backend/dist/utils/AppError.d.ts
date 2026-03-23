export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly code?: string;
    constructor(message: string, statusCode: number, isOperational?: boolean, code?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string, code?: string);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, code?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, code?: string);
}
//# sourceMappingURL=AppError.d.ts.map