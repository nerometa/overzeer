import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { eq } from "drizzle-orm";
import {
  getProjections,
  getRevenueBreakdown,
  getSalesVelocity,
} from "../services/analytics.service";

const { events } = schema;

async function assertEventOwnership(eventId: string, userId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true, userId: true },
  });

  if (!event || event.userId !== userId) {
    throw new Error("Event not found");
  }
}

export const analyticsRoutes = new Elysia({ prefix: "/api/analytics" })
  .use(authMiddleware)
  
  // GET /api/analytics/revenue?eventId=xxx
  .get(
    "/revenue",
    async ({ query, session, set }) => {
      const userSession = requireAuth(session);
      try {
        await assertEventOwnership(query.eventId, userSession.user.id);
        return await getRevenueBreakdown(query.eventId);
      } catch (error) {
        set.status = 404;
        return { error: "Event not found" };
      }
    },
    {
      query: t.Object({
        eventId: t.String(),
      }),
      detail: {
        tags: ["analytics"],
        summary: "Get revenue breakdown for event",
      },
    }
  )
  
  // GET /api/analytics/velocity?eventId=xxx
  .get(
    "/velocity",
    async ({ query, session, set }) => {
      const userSession = requireAuth(session);
      try {
        await assertEventOwnership(query.eventId, userSession.user.id);
        return await getSalesVelocity(query.eventId);
      } catch (error) {
        set.status = 404;
        return { error: "Event not found" };
      }
    },
    {
      query: t.Object({
        eventId: t.String(),
      }),
      detail: {
        tags: ["analytics"],
        summary: "Get sales velocity for event",
      },
    }
  )
  
  // GET /api/analytics/projections?eventId=xxx
  .get(
    "/projections",
    async ({ query, session, set }) => {
      const userSession = requireAuth(session);
      try {
        await assertEventOwnership(query.eventId, userSession.user.id);
        return await getProjections(query.eventId);
      } catch (error) {
        set.status = 404;
        return { error: "Event not found" };
      }
    },
    {
      query: t.Object({
        eventId: t.String(),
      }),
      detail: {
        tags: ["analytics"],
        summary: "Get projections for event",
      },
    }
  )
  
  // GET /api/analytics/comprehensive?eventId=xxx
  .get(
    "/comprehensive",
    async ({ query, session, set }) => {
      const userSession = requireAuth(session);
      try {
        await assertEventOwnership(query.eventId, userSession.user.id);

        const [revenue, velocity, projections] = await Promise.all([
          getRevenueBreakdown(query.eventId),
          getSalesVelocity(query.eventId),
          getProjections(query.eventId),
        ]);

        return {
          revenue,
          velocity,
          projections,
        };
      } catch (error) {
        set.status = 404;
        return { error: "Event not found" };
      }
    },
    {
      query: t.Object({
        eventId: t.String(),
      }),
      detail: {
        tags: ["analytics"],
        summary: "Get comprehensive analytics for event",
      },
    }
  );
