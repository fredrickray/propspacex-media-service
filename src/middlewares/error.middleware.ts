import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export class HttpError extends Error implements AppError {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string = "Bad request") {
    super(message, 400);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string = "Not found") {
    super(message, 404);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string = "Conflict") {
    super(message, 409);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string = "Internal server error") {
    super(message, 500);
  }
}

function handleZodError(err: ZodError): {
  statusCode: number;
  message: string;
  errors: { field: string; message: string }[];
} {
  const errors = err.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return {
    statusCode: 400,
    message: "Validation error",
    errors,
  };
}

function handleMulterError(err: MulterError): {
  statusCode: number;
  message: string;
} {
  let message = "File upload error";

  switch (err.code) {
    case "LIMIT_FILE_SIZE":
      message = "File too large";
      break;
    case "LIMIT_FILE_COUNT":
      message = "Too many files";
      break;
    case "LIMIT_UNEXPECTED_FILE":
      message = `Unexpected field: ${err.field}`;
      break;
  }

  return {
    statusCode: 400,
    message,
  };
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("Error:", err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const { statusCode, message, errors } = handleZodError(err);
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
    return;
  }

  // Multer errors
  if (err instanceof MulterError) {
    const { statusCode, message } = handleMulterError(err);
    res.status(statusCode).json({
      success: false,
      message,
    });
    return;
  }

  // Custom HTTP errors
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // MongoDB duplicate key error
  interface MongoError extends Error {
    code?: number;
  }
  if ((err as MongoError).code === 11000) {
    res.status(409).json({
      success: false,
      message: "Duplicate entry",
    });
    return;
  }

  // Default error
  const statusCode = (err as AppError).statusCode || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Something went wrong"
      : err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
}
