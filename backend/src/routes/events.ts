import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { and, desc, eq } from "drizzle-orm";

const { events } = schema;

export const eventsRoutes = new Elysia({ prefix: "/events" })
  .use(authMiddleware)
  
  // GET /api/events - list all events
  .get(
    "/",
    async ({ session, set }) => {
      const userSession = requireAuth(session, set);
      if (!userSession) return { error: "Unauthorized" };
      return db.query.events.findMany({
        where: eq(events.userId, userSession.user.id),
        orderBy: desc(events.updatedAt),
      });
    },
    {
      detail: {
        tags: ["events"],
        summary: "List all events",
      },
    }
  )
  
  // GET /api/events/:id - get single event with relations
  .get(
    "/:id",
    async ({ params, session, set }) => {
      const userSession = requireAuth(session, set);
      if (!userSession) return { error: "Unauthorized" };
      const event = await db.query.events.findFirst({
        where: and(
          eq(events.id, params.id),
          eq(events.userId, userSession.user.id)
        ),
        with: {
          sales: {
            with: {
              platform: true,
            },
          },
          projections: true,
          manualSales: true,
        },
      });

      if (!event) {
        set.status = 404;
        return { error: "Event not found" };
      }

      return event;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["events"],
        summary: "Get event by ID",
      },
    }
  )
  
  // POST /api/events - create event
  .post(
    "/",
    async ({ body, session, set }) => {
      const userSession = requireAuth(session, set);
      if (!userSession) return { error: "Unauthorized" };
      const [created] = await db
        .insert(events)
        .values({
          userId: userSession.user.id,
          name: body.name,
          date: body.date,
          venue: body.venue,
          totalCapacity: body.totalCapacity,
        })
        .returning();

      if (!created) {
        set.status = 500;
        return { error: "Failed to create event" };
      }

      set.status = 201;
      return created;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        date: t.String({ minLength: 1 }),
        venue: t.Optional(t.String({ minLength: 1 })),
        totalCapacity: t.Optional(t.Number({ minimum: 1 })),
      }),
      detail: {
        tags: ["events"],
        summary: "Create new event",
      },
    }
  )
  
  // PATCH /api/events/:id - update event
  .patch(
    "/:id",
    async ({ params, body, session, set }) => {
      const userSession = requireAuth(session, set);
      if (!userSession) return { error: "Unauthorized" };
      const { id } = params;

      const updateValues: Partial<typeof events.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) updateValues.name = body.name;
      if (body.date !== undefined) updateValues.date = body.date;
      if (body.venue !== undefined) updateValues.venue = body.venue;
      if (body.totalCapacity !== undefined)
        updateValues.totalCapacity = body.totalCapacity;

      const [updated] = await db
        .update(events)
        .set(updateValues)
        .where(and(eq(events.id, id), eq(events.userId, userSession.user.id)))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: "Event not found" };
      }

      return updated;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        date: t.Optional(t.String({ minLength: 1 })),
        venue: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
        totalCapacity: t.Optional(t.Union([t.Number({ minimum: 1 }), t.Null()])),
      }),
      detail: {
        tags: ["events"],
        summary: "Update event",
      },
    }
  )
  
  // DELETE /api/events/:id - delete event
  .delete(
    "/:id",
    async ({ params, session, set }) => {
      const userSession = requireAuth(session, set);
      if (!userSession) return { error: "Unauthorized" };
      const [deleted] = await db
        .delete(events)
        .where(and(eq(events.id, params.id), eq(events.userId, userSession.user.id)))
        .returning({ id: events.id });

      if (!deleted) {
        set.status = 404;
        return { error: "Event not found" };
      }

      return { success: true };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["events"],
        summary: "Delete event",
      },
    }
  );
