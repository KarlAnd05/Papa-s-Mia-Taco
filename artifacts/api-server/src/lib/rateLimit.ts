import type { Request, RequestHandler } from "express";

// Client IP for rate limiting. Behind Replit's proxies the original client is the first
// X-Forwarded-For entry; req.ip alone could be a proxy address shared by every visitor.
export function clientIp(req: Request): string {
  const forwarded = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.ip || "unknown";
}

// Small fixed-window in-memory rate limiter. Per server instance, which is enough to slow down
// password guessing and form spam for a single restaurant.
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  private entry(key: string) {
    const e = this.hits.get(key);
    if (e && e.resetAt <= Date.now()) {
      this.hits.delete(key);
      return undefined;
    }
    return e;
  }

  isLimited(key: string): boolean {
    return (this.entry(key)?.count ?? 0) >= this.limit;
  }

  retryAfterSeconds(key: string): number {
    const e = this.entry(key);
    return e ? Math.ceil((e.resetAt - Date.now()) / 1000) : 0;
  }

  hit(key: string): void {
    const e = this.entry(key);
    if (e) e.count++;
    else this.hits.set(key, { count: 1, resetAt: Date.now() + this.windowMs });
    if (this.hits.size > 10_000) this.sweep();
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private sweep() {
    const now = Date.now();
    for (const [k, e] of this.hits) if (e.resetAt <= now) this.hits.delete(k);
  }
}

// Middleware: limit how often one IP can call an endpoint.
export function limitByIp(limiter: RateLimiter, message = "Too many requests. Please try again later."): RequestHandler {
  return (req, res, next) => {
    const key = clientIp(req);
    if (limiter.isLimited(key)) {
      res.setHeader("Retry-After", String(limiter.retryAfterSeconds(key)));
      res.status(429).json({ error: message });
      return;
    }
    limiter.hit(key);
    next();
  };
}
