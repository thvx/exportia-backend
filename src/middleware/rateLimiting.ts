import rateLimit from "express-rate-limit";

/**
 * Rate Limiting Configuration
 * Uses in-memory store for development (Redis can be added for production)
 */

/**
 * Global rate limiter
 * Limits: 100 requests per minute per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});

/**
 * Strict rate limiter for WTO API calls
 * Limits: 20 requests per minute (due to WTO API quotas)
 */
export const wtoRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: "WTO API rate limit exceeded. Please try again later.",
});

/**
 * Auth rate limiter (prevents brute force)
 * Limits: 5 failed attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true, // Only count failures
});
