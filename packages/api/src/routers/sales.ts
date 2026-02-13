import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db, schema } from "@overzeer/db";
const { events, sales } = schema;
import { and, desc, eq } from "drizzle-orm";

import { protectedProcedure, router } from "../index";

export const salesRouter = router({
  byEvent: protectedProcedure
    .input(z.object({ eventId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: and(eq(events.id, input.eventId), eq(events.userId, ctx.session.user.id)),
        columns: { id: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      return db.query.sales.findMany({
        where: eq(sales.eventId, input.eventId),
        with: { platform: true },
        orderBy: desc(sales.saleDate),
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        eventId: z.string().min(1),
        platformId: z.union([z.string().min(1), z.null()]).optional(),
        ticketType: z.union([z.string().min(1), z.null()]).optional(),
        quantity: z.number().int().positive(),
        pricePerTicket: z.number().positive(),
        fees: z.number().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.query.events.findFirst({
        where: and(eq(events.id, input.eventId), eq(events.userId, ctx.session.user.id)),
        columns: { id: true },
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const [created] = await db
        .insert(sales)
        .values({
          eventId: input.eventId,
          platformId: input.platformId ?? null,
          ticketType: input.ticketType ?? null,
          quantity: input.quantity,
          pricePerTicket: input.pricePerTicket,
          fees: input.fees,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create sale",
        });
      }

      return created;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.sales.findFirst({
        where: eq(sales.id, input.id),
        with: { event: { columns: { userId: true } } },
        columns: { id: true },
      });

      if (!existing || existing.event?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sale not found",
        });
      }

      await db.delete(sales).where(eq(sales.id, input.id));

      return { success: true } as const;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        platformId: z.union([z.string().min(1), z.null()]).optional(),
        ticketType: z.union([z.string().min(1), z.null()]).optional(),
        quantity: z.number().int().positive().optional(),
        pricePerTicket: z.number().positive().optional(),
        fees: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.sales.findFirst({
        where: eq(sales.id, input.id),
        with: { event: { columns: { userId: true } } },
        columns: { id: true },
      });

      if (!existing || existing.event?.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sale not found",
        });
      }

      const updateData = {
        platformId: input.platformId,
        ticketType: input.ticketType,
        quantity: input.quantity,
        pricePerTicket: input.pricePerTicket,
        fees: input.fees,
      };

      const [updated] = await db
        .update(sales)
        .set(updateData)
        .where(eq(sales.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update sale",
        });
      }

      return updated;
    }),
});
