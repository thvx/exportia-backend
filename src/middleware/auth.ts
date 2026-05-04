import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
import { JWTPayload, RequestContext } from "../types/index.js";

/**
 * Authentication Middleware
 * Supports both JWT tokens and API keys
 */

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context: RequestContext = {
    requestId: `req-${Date.now()}`,
    startTime: new Date(),
  };

  try {
    // Check for Bearer token (JWT)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as JWTPayload;
      context.userId = payload.userId;
      context.userRole = payload.role;
    }

    // Check for API key in header
    const apiKey = req.headers["x-api-key"] as string;
    if (apiKey) {
      // In production, validate against DB
      context.apiKey = apiKey;
      context.userId = `api-user-${apiKey.slice(0, 8)}`;
      context.userRole = "user";
    }

    // Attach context to request
    (req as any).context = context;

    const PUBLIC_PREFIXES = ["/api/auth/", "/health", "/docs"];
    if (context.userId) {
      logger.debug(`Authenticated: ${context.userId} (${context.userRole})`, context.requestId);
    } else if (!PUBLIC_PREFIXES.some((p) => req.path.startsWith(p))) {
      logger.debug(`Unauthenticated request from ${req.ip}`, context.requestId);
    }

    next();
  } catch (err) {
    logger.error(`Auth middleware error: ${err instanceof Error ? err.message : "Unknown error"}`, undefined, {
      error: err instanceof Error ? err.message : "Unknown",
    });
    context.userRole = "guest";
    (req as any).context = context;
    next(); // Continue without auth for public endpoints
  }
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = (req as any).context as RequestContext;
  const start = Date.now();

  // Capture response finish
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    logger.httpRequest(req.method, req.path, status, duration, context.requestId);
  });

  next();
}

/**
 * Error handling middleware
 */
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = (req as any).context as RequestContext;

  logger.error(`Error: ${err.message}`, err);

  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
    requestId: context.requestId,
    timestamp: new Date(),
  });
}
