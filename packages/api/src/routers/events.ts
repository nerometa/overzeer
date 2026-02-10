import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db, schema } from "@overzeer/db";
const { events } = schema;
import { and, desc, eq } from "drizzle-orm";

import { protectedProcedure, router } from "../index";

export const eventsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.events.findMany({
      where: eq(events.userId, ctx.session.user.id),
      orderBy: desc(events.updatedAt),
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: and(eq(events.id, input.id), eq(events.userId, ctx.session.user.id)),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return event;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        date: z.string().min(1),
        venue: z.string().min(1).optional(),
        totalCapacity: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await db
        .insert(events)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          date: input.date,
          venue: input.venue,
          totalCapacity: input.totalCapacity,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event",
        });
      }

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        date: z.string().min(1).optional(),
        venue: z.union([z.string().min(1), z.null()]).optional(),
        totalCapacity: z.number().int().positive().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      const updateValues: Partial<typeof events.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (rest.name !== undefined) updateValues.name = rest.name;
      if (rest.date !== undefined) updateValues.date = rest.date;
      if (rest.venue !== undefined) updateValues.venue = rest.venue;
      if (rest.totalCapacity !== undefined)
        updateValues.totalCapacity = rest.totalCapacity;

      const [updated] = await db
        .update(events)
        .set(updateValues)
        .where(and(eq(events.id, id), eq(events.userId, ctx.session.user.id)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(events)
        .where(and(eq(events.id, input.id), eq(events.userId, ctx.session.user.id)))
        .returning({ id: events.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return { success: true } as const;
    }),
});
