import type { AppRouter } from "@overzeer/api/routers/index";

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_SERVER_URL || "";
  }
  return process.env.SERVER_URL || `http://127.0.0.1:${process.env.PORT || 3001}`;
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
