import { Elysia, type Context } from "elysia";
import { auth } from "../auth";

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .derive({ as: "scoped" }, async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return {
      session,
    };
  });

/**
 * Requires authentication for a route.
 * Returns null with 401 status if not authenticated, otherwise returns the session.
 * 
 * @param session - The session from authMiddleware
 * @param set - Elysia's set object for modifying response
 * @returns The session if authenticated, null otherwise
 */
export const requireAuth = (
  session: Session,
  set: Context["set"]
): Session | null => {
  if (!session) {
    set.status = 401;
    return null;
  }
  return session;
};
