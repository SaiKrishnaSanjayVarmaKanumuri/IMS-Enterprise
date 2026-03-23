"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const logger_js_1 = require("../utils/logger.js");
const AppError_js_1 = require("../utils/AppError.js");
const index_js_1 = require("../config/index.js");
const errorHandler = (err, req, res, next) => {
    let statusCode = 500;
    let message = "Internal server error";
    let code = "INTERNAL_ERROR";
    let isOperational = false;
    if (err instanceof AppError_js_1.AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code || "APP_ERROR";
        isOperational = err.isOperational;
    }
    else {
        // Log unexpected errors
        logger_js_1.logger.error(`Unexpected Error: ${err.message}`, {
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
        });
    }
    // Don't leak stack trace in production unless it's an operational error
    const errorResponse = {
        success: false,
        error: message,
        code,
    };
    if (index_js_1.config.nodeEnv === "development" || !isOperational) {
        if (index_js_1.config.nodeEnv === "development") {
            errorResponse.stack = err.stack;
        }
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const error = new AppError_js_1.AppError(`Route ${req.originalUrl} not found`, 404, true, "NOT_FOUND");
    next(error);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorMiddleware.js.map