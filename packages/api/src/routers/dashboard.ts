import { z } from "zod";

import { db, schema } from "@overzeer/db";
const { events, platforms, sales } = schema;
import { desc, eq, sql } from "drizzle-orm";

import { protectedProcedure, router } from "../index";

export const dashboardRouter = router({
  overview: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const [eventsAgg] = await db
        .select({
          totalEvents: sql<number>`cast(count(*) as integer)`,
        })
        .from(events)
        .where(eq(events.userId, userId));

      const [salesAgg] = await db
        .select({
          totalRevenue: sql<number>`coalesce(sum(${sales.quantity} * ${sales.pricePerTicket} - coalesce(${sales.fees}, 0)), 0)`,
          totalTicketsSold: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
        })
        .from(sales)
        .innerJoin(events, eq(sales.eventId, events.id))
        .where(eq(events.userId, userId));

      const recentSales = await db
        .select({
          sale: sales,
          platform: platforms,
          event: events,
        })
        .from(sales)
        .innerJoin(events, eq(sales.eventId, events.id))
        .leftJoin(platforms, eq(sales.platformId, platforms.id))
        .where(eq(events.userId, userId))
        .orderBy(desc(sales.saleDate))
        .limit(10);

      return {
        totalEvents: eventsAgg?.totalEvents ?? 0,
        totalRevenue: salesAgg?.totalRevenue ?? 0,
        totalTicketsSold: salesAgg?.totalTicketsSold ?? 0,
        recentSales,
      };
    }),
});
