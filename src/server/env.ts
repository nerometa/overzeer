import { z } from "zod";
import { config } from "dotenv";
import { resolve } from "path";

// Skip env loading during Next.js build (build runs before .env is mounted)
const isBuildTime = process.argv.some((arg) => arg.includes("next build"));

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

// During build, provide dummy values to allow build to succeed
const buildEnv = {
  DATABASE_URL: "file:./data/local.db",
  BETTER_AUTH_SECRET: "build-time-dummy-secret-min-32-chars",
  BETTER_AUTH_URL: "http://localhost:3000",
  NODE_ENV: "production",
  CORS_ORIGIN: undefined,
  SERVER_PORT: 3000,
  NEXT_PUBLIC_API_URL: undefined,
};

const runtimeEnv = parsed.success ? parsed.data : buildEnv;
export const env = isBuildTime ? buildEnv : runtimeEnv;
