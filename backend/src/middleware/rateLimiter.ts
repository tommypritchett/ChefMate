import rateLimit from 'express-rate-limit';

// Strict rate limiter for auth endpoints (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: false,
});

// Moderate rate limiter for expensive AI/recipe generation endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP/user to 10 AI requests per hour
  message: 'Too many AI requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID for rate limiting if authenticated
  keyGenerator: (req) => {
    // @ts-ignore - req.user is added by auth middleware
    return req.user?.userId || req.ip || 'unknown';
  },
});

// Rate limiter for chat/conversation endpoints
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: 'Too many messages, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // @ts-ignore
    return req.user?.userId || req.ip || 'unknown';
  },
});

// General API rate limiter (applied to all routes as fallback)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limiter for password reset (prevent abuse)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset requests per hour per IP
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
