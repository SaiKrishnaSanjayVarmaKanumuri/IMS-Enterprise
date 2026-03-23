export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(
        message: string,
        statusCode: number,
        isOperational = true,
        code?: string,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;

        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message: string, code = "VALIDATION_ERROR") {
        super(message, 400, true, code);
    }
}

export class AuthenticationError extends AppError {
    constructor(message = "Authentication failed", code = "AUTH_FAILED") {
        super(message, 401, true, code);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden access", code = "FORBIDDEN") {
        super(message, 403, true, code);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found", code = "NOT_FOUND") {
        super(message, 404, true, code);
    }
}
