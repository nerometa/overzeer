import { Elysia } from "elysia";
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

export const requireAuth = (session: Session) => {
  if (!session) {
    throw new Error("Authentication required");
  }
  return session;
};
