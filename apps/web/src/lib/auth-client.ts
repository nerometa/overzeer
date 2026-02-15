import { createAuthClient } from "better-auth/react";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SERVER_URL || "";
  }
  return process.env.SERVER_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
});
