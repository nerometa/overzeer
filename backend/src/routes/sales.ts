import { Elysia, t } from "elysia";
import { db, schema } from "../db";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { and, desc, eq } from "drizzle-orm";

const { events, sales } = schema;

export const salesRoutes = new Elysia({ prefix: "/api/sales" })
  .use(authMiddleware)
  
  // GET /api/sales?eventId=xxx - list sales for event
  .get(
    "/",
    async ({ query, session, set }) => {
      const userSession = requireAuth(session);
      const { eventId } = query;

      if (!eventId) {
        set.status = 400;
        return { error: "eventId query parameter is required" };
      }

      const event = await db.query.events.findFirst({
        where: and(
          eq(events.id, eventId),
          eq(events.userId, userSession.user.id)
        ),
        columns: { id: true },
      });

      if (!event) {
        set.status = 404;
        return { error: "Event not found" };
      }

      return db.query.sales.findMany({
        where: eq(sales.eventId, eventId),
        with: { platform: true },
        orderBy: desc(sales.saleDate),
      });
    },
    {
      query: t.Object({
        eventId: t.String(),
      }),
      detail: {
        tags: ["sales"],
        summary: "List sales for an event",
      },
    }
  )
  
  // POST /api/sales - create sale
  .post(
    "/",
    async ({ body, session, set }) => {
      const userSession = requireAuth(session);
      
      const event = await db.query.events.findFirst({
        where: and(
          eq(events.id, body.eventId),
          eq(events.userId, userSession.user.id)
        ),
        columns: { id: true },
      });

      if (!event) {
        set.status = 404;
        return { error: "Event not found" };
      }

      const [created] = await db
        .insert(sales)
        .values({
          eventId: body.eventId,
          platformId: body.platformId ?? null,
          ticketType: body.ticketType ?? null,
          quantity: body.quantity,
          pricePerTicket: body.pricePerTicket,
          fees: body.fees,
        })
        .returning();

      if (!created) {
        set.status = 500;
        return { error: "Failed to create sale" };
      }

      set.status = 201;
      return created;
    },
    {
      body: t.Object({
        eventId: t.String({ minLength: 1 }),
        platformId: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
        ticketType: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
        quantity: t.Number({ minimum: 1 }),
        pricePerTicket: t.Number({ minimum: 0.01 }),
        fees: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ["sales"],
        summary: "Create new sale",
      },
    }
  )
  
  // PATCH /api/sales/:id - update sale
  .patch(
    "/:id",
    async ({ params, body, session, set }) => {
      const userSession = requireAuth(session);

      const existing = await db.query.sales.findFirst({
        where: eq(sales.id, params.id),
        with: { event: { columns: { userId: true } } },
        columns: { id: true },
      });

      if (!existing || existing.event?.userId !== userSession.user.id) {
        set.status = 404;
        return { error: "Sale not found" };
      }

      const updateData: Partial<typeof sales.$inferInsert> = {};
      if (body.platformId !== undefined) updateData.platformId = body.platformId;
      if (body.ticketType !== undefined) updateData.ticketType = body.ticketType;
      if (body.quantity !== undefined) updateData.quantity = body.quantity;
      if (body.pricePerTicket !== undefined) updateData.pricePerTicket = body.pricePerTicket;
      if (body.fees !== undefined) updateData.fees = body.fees;

      const [updated] = await db
        .update(sales)
        .set(updateData)
        .where(eq(sales.id, params.id))
        .returning();

      if (!updated) {
        set.status = 500;
        return { error: "Failed to update sale" };
      }

      return updated;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        platformId: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
        ticketType: t.Optional(t.Union([t.String({ minLength: 1 }), t.Null()])),
        quantity: t.Optional(t.Number({ minimum: 1 })),
        pricePerTicket: t.Optional(t.Number({ minimum: 0.01 })),
        fees: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ["sales"],
        summary: "Update sale",
      },
    }
  )
  
  // DELETE /api/sales/:id - delete sale
  .delete(
    "/:id",
    async ({ params, session, set }) => {
      const userSession = requireAuth(session);

      const existing = await db.query.sales.findFirst({
        where: eq(sales.id, params.id),
        with: { event: { columns: { userId: true } } },
        columns: { id: true },
      });

      if (!existing || existing.event?.userId !== userSession.user.id) {
        set.status = 404;
        return { error: "Sale not found" };
      }

      await db.delete(sales).where(eq(sales.id, params.id));

      return { success: true };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["sales"],
        summary: "Delete sale",
      },
    }
  );
