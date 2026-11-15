import type { ErrorRequestHandler, RequestHandler } from "express";

export type ErrorCode = "INVALID_JSON" | "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "VALIDATION_ERROR" | "INTERNAL_ERROR";

export interface FieldError {
    field: string;
    message: string;
}

// Thrown anywhere in a request to end it with a specific status and code.
// The error middleware below turns it into the one error format the API uses.
export class AppError extends Error {
    status: number;
    code: ErrorCode;
    details: FieldError[] | undefined;

    constructor(status: number, code: ErrorCode, message: string, details?: FieldError[]) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function notFound(what: string): AppError {
    return new AppError(404, "NOT_FOUND", `${what} not found`);
}

export function conflict(message: string): AppError {
    return new AppError(409, "CONFLICT", message);
}

export function validationError(details: FieldError[], message = "Request body is invalid"): AppError {
    return new AppError(422, "VALIDATION_ERROR", message, details);
}

function errorBody(code: ErrorCode, message: string, details?: FieldError[]) {
    return { error: { code, message, ...(details && { details }) } };
}

// Runs when no route matched the request.
export const routeNotFound: RequestHandler = (req, res) => {
    res.status(404).json(errorBody("NOT_FOUND", `Route ${req.method} ${req.path} not found`));
};

// Express recognises error middleware by its four arguments.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        res.status(err.status).json(errorBody(err.code, err.message, err.details));
        return;
    }

    // express.json() could not parse the request body.
    if (err?.type === "entity.parse.failed") {
        res.status(400).json(errorBody("INVALID_JSON", "Request body is not valid JSON"));
        return;
    }

    // Other client errors raised by middleware, such as a body that is too large.
    if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
        res.status(err.status).json(errorBody("BAD_REQUEST", err.message));
        return;
    }

    // Anything unexpected: log the details, send the client nothing specific.
    console.error(err);
    res.status(500).json(errorBody("INTERNAL_ERROR", "Something went wrong"));
};
