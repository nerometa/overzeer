import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL,
});
