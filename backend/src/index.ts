import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { auth } from "./auth";
import { env } from "./env";
import { authMiddleware, requireAuth } from "./middleware/auth";
import { eventsRoutes } from "./routes/events";
import { salesRoutes } from "./routes/sales";
import { platformsRoutes } from "./routes/platforms";
import { analyticsRoutes } from "./routes/analytics";
import { dashboardRoutes } from "./routes/dashboard";

export const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .onBeforeHandle(({ set }) => {
    set.headers["X-Content-Type-Options"] = "nosniff";
    set.headers["X-Frame-Options"] = "DENY";
    set.headers["X-XSS-Protection"] = "0";
    set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    set.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
  })
  .onError(({ code, error, set }) => {
    console.error(`Error [${code}]:`, error);
    
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Validation failed",
        message: error instanceof Error ? error.message : "Invalid request",
      };
    }
    
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        error: "Not found",
        message: error instanceof Error ? error.message : "Resource not found",
      };
    }
    
    set.status = 500;
    return {
      error: "Internal server error",
      message: env.NODE_ENV === "development" && error instanceof Error ? error.message : "Something went wrong",
    };
  })
  .all("/api/auth/*", async (context) => {
    const { request } = context;
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return new Response("Method not allowed", { status: 405 });
  })
  .use(authMiddleware)
  .get("/api/me", ({ session }) => {
    const userSession = requireAuth(session);
    return { user: userSession.user };
  })
  .use(eventsRoutes)
  .use(salesRoutes)
  .use(platformsRoutes)
  .use(analyticsRoutes)
  .use(dashboardRoutes)
  .get("/", () => ({ message: "Overzeer API v2.0", status: "ok" }))
  .get("/health", () => ({ status: "healthy" }))
  .listen(env.SERVER_PORT, () => {
    console.log(`🦊 Elysia server running at http://localhost:${env.SERVER_PORT}`);
  });

export type App = typeof app;
