import { protectedProcedure, publicProcedure, router } from "../index";

import { analyticsRouter } from "./analytics";
import { dashboardRouter } from "./dashboard";
import { eventsRouter } from "./events";
import { platformsRouter } from "./platforms";
import { salesRouter } from "./sales";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: {
        id: ctx.session.user.id,
        name: ctx.session.user.name,
        email: ctx.session.user.email,
      },
    };
  }),

  events: eventsRouter,
  sales: salesRouter,
  platforms: platformsRouter,
  analytics: analyticsRouter,
  dashboard: dashboardRouter,
});
export type AppRouter = typeof appRouter;
