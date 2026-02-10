import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db, schema } from "@overzeer/db";
const { events } = schema;
import { eq } from "drizzle-orm";

import { protectedProcedure, router } from "../index";
import {
  getProjections,
  getRevenueBreakdown,
  getSalesVelocity,
} from "../services/analytics.service";

const eventInput = z.object({
  eventId: z.string().min(1),
});

async function assertEventOwnership(eventId: string, userId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true, userId: true },
  });

  if (!event || event.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }
}

export const analyticsRouter = router({
  revenue: protectedProcedure.input(eventInput).query(async ({ ctx, input }) => {
    await assertEventOwnership(input.eventId, ctx.session.user.id);
    return getRevenueBreakdown(input.eventId);
  }),

  velocity: protectedProcedure.input(eventInput).query(async ({ ctx, input }) => {
    await assertEventOwnership(input.eventId, ctx.session.user.id);
    return getSalesVelocity(input.eventId);
  }),

  projections: protectedProcedure
    .input(eventInput)
    .query(async ({ ctx, input }) => {
      await assertEventOwnership(input.eventId, ctx.session.user.id);
      return getProjections(input.eventId);
    }),

  comprehensive: protectedProcedure
    .input(eventInput)
    .query(async ({ ctx, input }) => {
      await assertEventOwnership(input.eventId, ctx.session.user.id);

      const [revenue, velocity, projections] = await Promise.all([
        getRevenueBreakdown(input.eventId),
        getSalesVelocity(input.eventId),
        getProjections(input.eventId),
      ]);

      return {
        revenue,
        velocity,
        projections,
      };
    }),
});
