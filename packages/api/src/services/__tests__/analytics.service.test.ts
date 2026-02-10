import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TRPCError } from "@trpc/server";
import { eq, and, gte, desc } from "drizzle-orm";

function ensureTestEnv() {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:../../local.db";
  process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
  process.env.BETTER_AUTH_URL ??= "https://example.com";
  process.env.CORS_ORIGIN ??= "https://example.com";
}

ensureTestEnv();

const { getRevenueBreakdown, getSalesVelocity, getProjections } =
  await import("../analytics.service");
const { db, schema } = await import("@overzeer/db");
const { user, events, sales, projections } = schema;

async function getDemoUserId() {
  const candidates = ["demo@overzeer.com", "demo@overzeer.dev"];
  for (const email of candidates) {
    const u = await db.query.user.findFirst({
      where: eq(user.email, email),
      columns: { id: true },
    });
    if (u?.id) return u.id;
  }
  throw new Error("Demo user not found in seeded database");
}

async function getSeededEventIdForUser(userId: string) {
  const [row] = await db
    .select({ eventId: events.id })
    .from(events)
    .innerJoin(sales, eq(sales.eventId, events.id))
    .where(eq(events.userId, userId))
    .orderBy(desc(events.updatedAt))
    .limit(1);

  if (!row?.eventId) {
    throw new Error("No seeded event with sales found for demo user");
  }
  return row.eventId;
}

describe("analytics.service", () => {
  let demoUserId: string;
  let seededEventId: string;
  let projectionsInsertedAfter: Date;

  beforeAll(async () => {
    demoUserId = await getDemoUserId();
    seededEventId = await getSeededEventIdForUser(demoUserId);
    projectionsInsertedAfter = new Date();
  });

  afterAll(async () => {
    // getProjections persists a projections row; clean up rows created by this test run.
    await db
      .delete(projections)
      .where(and(eq(projections.eventId, seededEventId), gte(projections.calculationDate, projectionsInsertedAfter)));
  });

  it("getRevenueBreakdown(eventId): returns totals and breakdowns", async () => {
    const res = await getRevenueBreakdown(seededEventId);

    expect(res.totalRevenue).toBeGreaterThan(0);
    expect(res.totalFees).toBeGreaterThanOrEqual(0);
    expect(res.netRevenue).toBe(res.totalRevenue - res.totalFees);

    expect(Array.isArray(res.revenueByPlatform)).toBe(true);
    expect(res.revenueByPlatform.length).toBeGreaterThan(0);

    expect(Array.isArray(res.revenueByTicketType)).toBe(true);
    expect(res.revenueByTicketType.length).toBeGreaterThan(0);
  });

  it("getSalesVelocity(eventId): returns velocity metrics", async () => {
    const res = await getSalesVelocity(seededEventId);

    expect(res.totalTicketsSold).toBeGreaterThan(0);
    expect(res.dailyAverage).toBeGreaterThan(0);
    expect(res.weeklyAverage).toBeGreaterThan(0);
    expect(["increasing", "decreasing", "stable"]).toContain(res.trend);

    expect(Array.isArray(res.salesByDay)).toBe(true);
    expect(res.salesByDay.length).toBeGreaterThan(0);
    for (const day of res.salesByDay) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(day.ticketsSold).toBeGreaterThan(0);
      expect(day.revenue).toBeGreaterThan(0);
    }
  });

  it("getProjections(eventId): returns projections", async () => {
    const res = await getProjections(seededEventId);

    expect(res.projectedTotalRevenue).toBeGreaterThan(0);
    expect(res.projectedTotalTickets).toBeGreaterThan(0);
    expect(["high", "medium", "low"]).toContain(res.confidenceLevel);
    expect(typeof res.asOf).toBe("string");
    expect(new Date(res.asOf).toString()).not.toBe("Invalid Date");

    if (res.percentageSold !== null) {
      expect(typeof res.percentageSold).toBe("number");
    }
  });

  it("nonexistent eventId throws TRPCError NOT_FOUND", async () => {
    const missingEventId = "evt_does_not_exist";

    await expect(getRevenueBreakdown(missingEventId)).rejects.toBeInstanceOf(TRPCError);
    await expect(getRevenueBreakdown(missingEventId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await expect(getSalesVelocity(missingEventId)).rejects.toBeInstanceOf(TRPCError);
    await expect(getSalesVelocity(missingEventId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    await expect(getProjections(missingEventId)).rejects.toBeInstanceOf(TRPCError);
    await expect(getProjections(missingEventId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
