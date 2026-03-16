import { createAuthClient } from "better-auth/react";
 
/**
 * Auth client URL strategy:
 *
 * CLIENT-SIDE (browser): Uses relative URL "" so requests go to the same
 *   origin (the frontend). The Next.js catch-all proxy at /api/[...slug]
 *   then forwards them internally to the backend via API_INTERNAL_URL.
 *   This means the browser never needs to know the backend's address.
 *
 * SERVER-SIDE (SSR): Uses the Docker-internal URL directly, bypassing
 *   the proxy for speed.
 */
const baseURL =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? "http://backend:3000")
    : ""; // relative — hits Next.js proxy
 
export const authClient = createAuthClient({
  baseURL,
});
