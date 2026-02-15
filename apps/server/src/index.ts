import { cors } from "@elysiajs/cors";
import { createContext } from "@overzeer/api/context";
import { appRouter } from "@overzeer/api/routers/index";
import { auth } from "@overzeer/auth";
import { env } from "@overzeer/env/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Elysia } from "elysia";

export const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
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
  .get("/health", () => ({ status: "ok" }))
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;
    if (["POST", "GET"].includes(request.method)) {
      return auth.handler(request);
    }
    return status(405);
  })
  .all("/trpc/*", async (context) => {
    const res = await fetchRequestHandler({
      endpoint: "/trpc",
      router: appRouter,
      req: context.request,
      createContext: () => createContext({ context }),
    });
    return res;
  })
  .get("/", () => "OK")
  .listen({
    port: Number(process.env.PORT) || 3000,
    hostname: "0.0.0.0",
  }, () => {
    console.log("Server is running on http://0.0.0.0:3000");
  });
