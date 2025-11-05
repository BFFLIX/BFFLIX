
import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute window
  limit: 5,                      // limit to 5 requests per minute per IP
  
  standardHeaders: true,        // return rate limit info in headers
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
});
