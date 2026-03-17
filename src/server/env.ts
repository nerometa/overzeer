import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "path";

// Check for build-time flag (set during Docker build)
// SKIP_DB_PUSH=1 means we're in build mode, not runtime
const isBuildTime = process.env.SKIP_DB_PUSH === "1" || process.argv.some((arg) => arg.includes("next build"));

if (!isBuildTime) {
  config({ path: resolve(process.cwd(), ".env") });
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  CORS_ORIGIN: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SERVER_PORT: z.string().transform((val) => parseInt(val, 10)).optional().default(3000),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !isBuildTime) {
  console.error("❌ Invalid environment variables:");
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

// Build-time fallback values — used when SKIP_DB_PUSH=1 during Docker build
// Real env vars provided by Docker Compose at runtime via env_file
const buildEnv = {
  DATABASE_URL: process.env.DATABASE_URL || "file:./data/local.db",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "build-time-dummy-secret-min-32-chars",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  NODE_ENV: (process.env.NODE_ENV as "development" | "production" | "test") || "production",
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  SERVER_PORT: process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT, 10) : 3001,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
};

const runtimeEnv = parsed.success ? parsed.data : buildEnv;
export const env = isBuildTime ? buildEnv : runtimeEnv;

// Warn if running with build-time values at runtime (misconfiguration)
if (isBuildTime && process.env.NODE_ENV !== "development") {
  console.warn("⚠️  Running with build-time dummy env values.");
}
