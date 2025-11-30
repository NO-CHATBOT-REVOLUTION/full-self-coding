import { Request, Response, NextFunction } from 'express';

/**
 * Error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Unhandled error:', error);

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack, details: error })
  });
};

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  // Listen for response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'ERROR' : 'INFO';
    console.log(`[${level}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

/**
 * CORS middleware
 */
export const corsHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  public isAllowed(identifier: string): boolean {
    const now = Date.now();
    const existing = this.requests.get(identifier);

    if (!existing || existing.resetTime < now) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (existing.count >= this.maxRequests) {
      return false;
    }

    existing.count++;
    return true;
  }

  public getRemainingRequests(identifier: string): number {
    const data = this.requests.get(identifier);
    if (!data || data.resetTime < Date.now()) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - data.count);
  }

  public getResetTime(identifier: string): number | null {
    const data = this.requests.get(identifier);
    if (!data) {
      return null;
    }
    return data.resetTime;
  }
}

const rateLimiter = new RateLimiter();

export const rateLimit = (options?: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later'
  } = options || {};

  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    if (!rateLimiter.isAllowed(identifier)) {
      const resetTime = rateLimiter.getResetTime(identifier);
      const remaining = rateLimiter.getRemainingRequests(identifier);

      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime / 1000).toString() : '',
        'Retry-After': resetTime ? Math.ceil((resetTime - Date.now()) / 1000).toString() : '60'
      });

      return res.status(429).json({
        error: message,
        retryAfter: resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60
      });
    }

    const remaining = rateLimiter.getRemainingRequests(identifier);
    const resetTime = rateLimiter.getResetTime(identifier);

    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime / 1000).toString() : ''
    });

    next();
  };
};

/**
 * Validate JSON middleware
 */
export const validateJSON = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Content-Type must be application/json'
      });
    }
  }

  next();
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: `Request took longer than ${timeoutMs}ms`
        });
      }
    }, timeoutMs);

    // Clear timeout when request finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('error', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

/**
 * Health check middleware
 */
export const healthCheck = (req: Request, res: Response): void => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(health);
};