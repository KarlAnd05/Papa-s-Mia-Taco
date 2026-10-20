import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./lib/http";

const app: Express = express();

// Behind Replit's proxy: use X-Forwarded-For for the client IP (rate limiting)
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// The website and API share one origin, so reject state-changing requests that browsers mark as
// coming from another site (defence in depth on top of the SameSite session cookie).
// Sec-Fetch-Site is set by the browser itself, so it is unaffected by proxies rewriting Host.
app.use("/api", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (req.get("sec-fetch-site") === "cross-site") {
    return res.status(403).json({ error: "Cross-site request blocked" });
  }
  return next();
});

app.use("/api", router);
app.use(errorHandler);

export default app;
