import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * createRateLimiter
 * @param maxRequests  max allowed requests in the window
 * @param windowMs     window length in milliseconds
 * @param message      error message returned when limit is hit
 */
export function createRateLimiter(
  maxRequests: number,
  windowMs: number,
  message = 'Too many requests. Please try again later.',
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP + route as the key so limits are per-endpoint
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${ip}:${req.path}`;

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfterSecs = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSecs));
      res.status(429).json({ message });
      return;
    }

    entry.count += 1;
    next();
  };
}

// Prebuilt limiters for auth routes
export const authLimiter = createRateLimiter(
  10,          // 10 attempts
  15 * 60 * 1000, // per 15 minutes
  'Too many attempts. Please wait 15 minutes before trying again.',
);

export const forgotPasswordLimiter = createRateLimiter(
  3,           // 3 attempts
  60 * 60 * 1000, // per hour
  'Too many reset requests. Please wait an hour before trying again.',
);
