import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { config } from "../config/index.js";

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    let statusCode = 500;
    let message = "Internal server error";
    let code = "INTERNAL_ERROR";
    let isOperational = false;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code || "APP_ERROR";
        isOperational = err.isOperational;
    } else {
        // Log unexpected errors
        logger.error(`Unexpected Error: ${err.message}`, {
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
        });
    }

    // Don't leak stack trace in production unless it's an operational error
    const errorResponse: any = {
        success: false,
        error: message,
        code,
    };

    if (config.nodeEnv === "development" || !isOperational) {
        if (config.nodeEnv === "development") {
            errorResponse.stack = err.stack;
        }
    }

    res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const error = new AppError(
        `Route ${req.originalUrl} not found`,
        404,
        true,
        "NOT_FOUND",
    );
    next(error);
};
