import { env } from "@overzeer/env/web";
import { createAuthClient } from "better-auth/react";

const getServerBaseUrl = () => {
  if (typeof window !== "undefined") {
    return env.NEXT_PUBLIC_SERVER_URL;
  }
  return "http://server:3000";
};

export const authClient = createAuthClient({
  baseURL: getServerBaseUrl(),
});
