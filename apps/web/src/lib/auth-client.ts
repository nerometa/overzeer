import { createAuthClient } from "better-auth/react";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return "";
  }
  const port = process.env.PORT ?? "3001";
  return `http://127.0.0.1:${port}`;
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
});
