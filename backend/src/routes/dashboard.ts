import { Elysia } from "elysia";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { getDashboardAnalytics } from "../services/analytics.service";

export const dashboardRoutes = new Elysia({ prefix: "/dashboard" })
  .use(authMiddleware)
  
  // GET /api/dashboard - get dashboard overview
  .get(
    "/",
    async ({ session }) => {
      const userSession = requireAuth(session);
      return getDashboardAnalytics(userSession.user.id);
    },
    {
      detail: {
        tags: ["dashboard"],
        summary: "Get dashboard overview",
      },
    }
  );
