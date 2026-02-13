import { TRPCError } from "@trpc/server";

import { db, schema } from "@overzeer/db";
const { events, platforms, sales } = schema;
import { desc, eq } from "drizzle-orm";

type RevenueByPlatform = {
  platformId: string | null;
  platformName: string;
  colorHex: string | null;
  revenue: number;
  fees: number;
  netRevenue: number;
  ticketsSold: number;
};

type RevenueByTicketType = {
  ticketType: string;
  revenue: number;
  ticketsSold: number;
  avgPrice: number;
};

export type RevenueBreakdown = {
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  revenueByPlatform: RevenueByPlatform[];
  revenueByTicketType: RevenueByTicketType[];
};

type SalesByDay = {
  date: string; // YYYY-MM-DD
  ticketsSold: number;
  revenue: number;
};

export type SalesVelocity = {
  totalTicketsSold: number;
  dailyAverage: number;
  weeklyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
  salesByDay: SalesByDay[];
};

export type Projections = {
  projectedTotalRevenue: number;
  projectedTotalTickets: number;
  percentageSold: number | null;
  daysUntilSellout: number | null;
  confidenceLevel: "high" | "medium" | "low";
  asOf: string; // ISO string
};

export type DashboardAnalytics = {
  totalEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  totalFees: number;
  eventSummaries: Array<{
    eventId: string;
    eventName: string;
    date: string;
    venue: string | null;
    revenue: number;
    ticketsSold: number;
  }>;
  recentSales: Array<{
    saleId: string;
    eventId: string;
    eventName: string;
    platformId: string | null;
    platformName: string;
    ticketType: string | null;
    quantity: number;
    pricePerTicket: number;
    fees: number;
    revenue: number;
    saleDate: string;
  }>;
};

function normalizeTicketType(ticketType: string | null): string {
  return ticketType?.trim() ? ticketType : "Unknown";
}

function normalizePlatform(platform: { id: string; name: string; colorHex: string | null } | null): {
  platformId: string | null;
  platformName: string;
  colorHex: string | null;
  key: string;
} {
  if (!platform) {
    return { platformId: null, platformName: "Unknown", colorHex: null, key: "__unknown__" };
  }
  return { platformId: platform.id, platformName: platform.name, colorHex: platform.colorHex, key: platform.id };
}

function toDateOnlyIso(date: Date): string {
  // saleDate is timestamp_ms (Date) from Drizzle.
  return date.toISOString().slice(0, 10);
}

function safeFees(fees: number | null | undefined): number {
  return fees ?? 0;
}

export async function getRevenueBreakdown(eventId: string): Promise<RevenueBreakdown> {
  const eventExists = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true },
  });

  if (!eventExists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  const eventSales = await db.query.sales.findMany({
    where: eq(sales.eventId, eventId),
      with: {
        platform: {
          columns: {
            id: true,
            name: true,
            colorHex: true,
          },
        },
      },
  });

  let totalRevenue = 0;
  let totalFees = 0;

  const byPlatform = new Map<string, RevenueByPlatform>();
  const byTicketType = new Map<string, { revenue: number; ticketsSold: number }>();

  for (const s of eventSales) {
    const revenue = s.quantity * s.pricePerTicket;
    const fees = safeFees(s.fees);

    totalRevenue += revenue;
    totalFees += fees;

    const platformInfo = normalizePlatform(s.platform ?? null);
    const platformAgg = byPlatform.get(platformInfo.key) ?? {
      platformId: platformInfo.platformId,
      platformName: platformInfo.platformName,
      colorHex: platformInfo.colorHex,
      revenue: 0,
      fees: 0,
      netRevenue: 0,
      ticketsSold: 0,
    };
    platformAgg.revenue += revenue;
    platformAgg.fees += fees;
    platformAgg.ticketsSold += s.quantity;
    platformAgg.netRevenue = platformAgg.revenue - platformAgg.fees;
    byPlatform.set(platformInfo.key, platformAgg);

    const ticketType = normalizeTicketType(s.ticketType);
    const ticketAgg = byTicketType.get(ticketType) ?? { revenue: 0, ticketsSold: 0 };
    ticketAgg.revenue += revenue;
    ticketAgg.ticketsSold += s.quantity;
    byTicketType.set(ticketType, ticketAgg);
  }

  const revenueByPlatform = [...byPlatform.values()].sort((a, b) => b.revenue - a.revenue);
  const revenueByTicketType: RevenueByTicketType[] = [...byTicketType.entries()]
    .map(([ticketType, agg]) => ({
      ticketType,
      revenue: agg.revenue,
      ticketsSold: agg.ticketsSold,
      avgPrice: agg.ticketsSold > 0 ? agg.revenue / agg.ticketsSold : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalFees,
    netRevenue: totalRevenue - totalFees,
    revenueByPlatform,
    revenueByTicketType,
  };
}

export async function getSalesVelocity(eventId: string): Promise<SalesVelocity> {
  const eventExists = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: { id: true },
  });

  if (!eventExists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  const eventSales = await db.query.sales.findMany({
    where: eq(sales.eventId, eventId),
    orderBy: (s, { asc }) => [asc(s.saleDate)],
  });

  let totalTicketsSold = 0;
  const salesByDayMap = new Map<string, { ticketsSold: number; revenue: number }>();

  for (const s of eventSales) {
    totalTicketsSold += s.quantity;
    const dateKey = toDateOnlyIso(s.saleDate);
    const revenue = s.quantity * s.pricePerTicket;
    const existing = salesByDayMap.get(dateKey) ?? { ticketsSold: 0, revenue: 0 };
    existing.ticketsSold += s.quantity;
    existing.revenue += revenue;
    salesByDayMap.set(dateKey, existing);
  }

  const salesByDay: SalesByDay[] = [...salesByDayMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, agg]) => ({
      date,
      ticketsSold: agg.ticketsSold,
      revenue: agg.revenue,
    }));

  const now = new Date();
  const firstSaleDate = eventSales[0]?.saleDate;
  const msPerDay = 24 * 60 * 60 * 1000;

  const daysSinceFirstSale = firstSaleDate
    ? Math.max(1, Math.ceil((now.getTime() - firstSaleDate.getTime()) / msPerDay))
    : 0;

  const dailyAverage = daysSinceFirstSale > 0 ? totalTicketsSold / daysSinceFirstSale : 0;
  const weeklyAverage = dailyAverage * 7;

  const last7DaysStart = new Date(now.getTime() - 7 * msPerDay);
  let last7DaysTickets = 0;
  for (const s of eventSales) {
    if (s.saleDate >= last7DaysStart) {
      last7DaysTickets += s.quantity;
    }
  }
  const last7DaysAverage = last7DaysTickets / 7;

  let trend: SalesVelocity["trend"] = "stable";
  if (dailyAverage > 0) {
    if (last7DaysAverage > dailyAverage * 1.1) trend = "increasing";
    else if (last7DaysAverage < dailyAverage * 0.9) trend = "decreasing";
  }

  return {
    totalTicketsSold,
    dailyAverage,
    weeklyAverage,
    trend,
    salesByDay,
  };
}

export async function getProjections(eventId: string): Promise<Projections> {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    columns: {
      id: true,
      totalCapacity: true,
    },
  });

  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
  }

  const [velocity, revenue] = await Promise.all([
    getSalesVelocity(eventId),
    getRevenueBreakdown(eventId),
  ]);

  const totalTicketsSold = velocity.totalTicketsSold;
  const totalRevenue = revenue.totalRevenue;

  const capacity = event.totalCapacity;
  const hasCapacity = typeof capacity === "number" && Number.isFinite(capacity) && capacity > 0;

  const avgPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

  const projectedTotalTickets = hasCapacity ? capacity : totalTicketsSold;
  const projectedTotalRevenue =
    hasCapacity && avgPrice > 0 ? avgPrice * projectedTotalTickets : totalRevenue;

  const percentageSold = hasCapacity ? (totalTicketsSold / capacity) * 100 : null;

  const remainingTickets = hasCapacity ? Math.max(0, capacity - totalTicketsSold) : null;
  const daysUntilSellout =
    hasCapacity && velocity.dailyAverage > 0 && remainingTickets !== null
      ? remainingTickets / velocity.dailyAverage
      : null;

  const confidenceLevel: Projections["confidenceLevel"] = !hasCapacity
    ? "low"
    : percentageSold !== null && percentageSold > 70
      ? "high"
      : percentageSold !== null && percentageSold >= 30
        ? "medium"
        : "low";

  const asOf = new Date();

  return {
    projectedTotalRevenue,
    projectedTotalTickets,
    percentageSold,
    daysUntilSellout,
    confidenceLevel,
    asOf: asOf.toISOString(),
  };
}

export async function getDashboardAnalytics(userId: string): Promise<DashboardAnalytics> {
  const userEvents = await db.query.events.findMany({
    where: eq(events.userId, userId),
    columns: {
      id: true,
      name: true,
      date: true,
      venue: true,
    },
    with: {
      sales: {
        columns: {
          quantity: true,
          pricePerTicket: true,
          fees: true,
        },
      },
    },
  });

  let totalRevenue = 0;
  let totalTicketsSold = 0;
  let totalFees = 0;

  const eventSummaries: DashboardAnalytics["eventSummaries"] = userEvents.map((e) => {
    let revenue = 0;
    let ticketsSold = 0;
    let fees = 0;

    for (const s of e.sales) {
      revenue += s.quantity * s.pricePerTicket;
      ticketsSold += s.quantity;
      fees += safeFees(s.fees);
    }

    totalRevenue += revenue;
    totalTicketsSold += ticketsSold;
    totalFees += fees;

    return {
      eventId: e.id,
      eventName: e.name,
      date: e.date,
      venue: e.venue ?? null,
      revenue,
      ticketsSold,
    };
  });

  const recent = await db
    .select({
      saleId: sales.id,
      eventId: events.id,
      eventName: events.name,
      platformId: platforms.id,
      platformName: platforms.name,
      ticketType: sales.ticketType,
      quantity: sales.quantity,
      pricePerTicket: sales.pricePerTicket,
      fees: sales.fees,
      saleDate: sales.saleDate,
    })
    .from(sales)
    .innerJoin(events, eq(sales.eventId, events.id))
    .leftJoin(platforms, eq(sales.platformId, platforms.id))
    .where(eq(events.userId, userId))
    .orderBy(desc(sales.saleDate))
    .limit(10);

  const recentSales: DashboardAnalytics["recentSales"] = recent.map((r) => {
    const fees = safeFees(r.fees);
    const platformName = r.platformName ?? "Unknown";
    const revenue = r.quantity * r.pricePerTicket;
    return {
      saleId: r.saleId,
      eventId: r.eventId,
      eventName: r.eventName,
      platformId: r.platformId ?? null,
      platformName,
      ticketType: r.ticketType ?? null,
      quantity: r.quantity,
      pricePerTicket: r.pricePerTicket,
      fees,
      revenue,
      saleDate: r.saleDate.toISOString(),
    };
  });

  return {
    totalEvents: userEvents.length,
    totalRevenue,
    totalTicketsSold,
    totalFees,
    eventSummaries: eventSummaries.sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
    ),
    recentSales,
  };
}
