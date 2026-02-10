import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "../../context";

type Session = NonNullable<Context["session"]>;

function ensureTestEnv() {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:../../local.db";
  process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
  process.env.BETTER_AUTH_URL ??= "https://example.com";
  process.env.CORS_ORIGIN ??= "https://example.com";
}

ensureTestEnv();

const { appRouter } = await import("../index");
const { db, schema } = await import("@overzeer/db");
const { user, events, sales } = schema;

async function getDemoUser() {
  const candidates = ["demo@overzeer.com", "demo@overzeer.dev"];
  for (const email of candidates) {
    const u = await db.query.user.findFirst({
      where: eq(user.email, email),
    });
    if (u) return u;
  }
  throw new Error("Demo user not found in seeded database");
}

function ctxForUser(userId: string, email: string, name: string): Context {
  const now = new Date();
  const session: Session = {
    user: {
      id: userId,
      email,
      name,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: crypto.randomUUID(),
      userId,
      token: crypto.randomUUID(),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
  };

  return {
    session,
  };
}

describe("sales router", () => {
  let demoUser: Awaited<ReturnType<typeof getDemoUser>>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let seededEventId: string;
  let seededPlatformId: string;

  // Ownership-check fixtures
  let otherUserId: string;
  let otherEventId: string;
  let otherSaleId: string;

  beforeAll(async () => {
    demoUser = await getDemoUser();
    const ctx = ctxForUser(demoUser.id, demoUser.email, demoUser.name);
    caller = appRouter.createCaller(ctx);

    const seededEvent = await db.query.events.findFirst({
      where: eq(events.userId, demoUser.id),
      columns: { id: true },
      orderBy: (e, { desc: d }) => [d(e.updatedAt)],
    });
    if (!seededEvent?.id) throw new Error("No seeded event found for demo user");
    seededEventId = seededEvent.id;

    const seededPlatform = await db.query.platforms.findFirst({
      columns: { id: true },
      orderBy: (p, { desc: d }) => [d(p.createdAt)],
    });
    if (!seededPlatform?.id) throw new Error("No seeded platform found");
    seededPlatformId = seededPlatform.id;

    // Create a second user + event + sale to validate ownership checks.
    otherUserId = crypto.randomUUID();
    await db.insert(user).values({
      id: otherUserId,
      name: "Other User",
      email: `other-${Date.now()}-${Math.random().toString(16).slice(2)}@overzeer.test`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [createdEvent] = await db
      .insert(events)
      .values({
        userId: otherUserId,
        name: "Other Event",
        date: "2026-08-08",
        venue: "Other Venue",
        totalCapacity: 10,
      })
      .returning({ id: events.id });

    if (!createdEvent?.id) throw new Error("Failed to create other user's event");
    otherEventId = createdEvent.id;

    const [createdSale] = await db
      .insert(sales)
      .values({
        eventId: otherEventId,
        platformId: seededPlatformId,
        ticketType: "VIP",
        quantity: 1,
        pricePerTicket: 100,
        fees: 0,
      })
      .returning({ id: sales.id });

    if (!createdSale?.id) throw new Error("Failed to create other user's sale");
    otherSaleId = createdSale.id;
  });

  afterAll(async () => {
    // Deleting other user cascades other event + sales.
    await db.delete(user).where(eq(user.id, otherUserId));
  });

  it("byEvent: returns sales with platform relation", async () => {
    const res = await caller.sales.byEvent({ eventId: seededEventId });
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);

    const hasPlatform = res.some((s) => s.platform !== null);
    expect(hasPlatform).toBe(true);
  });

  it("create: creates sale record", async () => {
    const created = await caller.sales.create({
      eventId: seededEventId,
      platformId: seededPlatformId,
      ticketType: "General Admission",
      quantity: 2,
      pricePerTicket: 123.45,
      fees: 5,
    });

    expect(created.id).toBeTruthy();
    expect(created.eventId).toBe(seededEventId);
    expect(created.quantity).toBe(2);
    expect(created.pricePerTicket).toBeCloseTo(123.45);
  });

  it("delete: deletes sale record", async () => {
    const created = await caller.sales.create({
      eventId: seededEventId,
      platformId: seededPlatformId,
      ticketType: "VIP",
      quantity: 1,
      pricePerTicket: 50,
      fees: 0,
    });

    const res = await caller.sales.delete({ id: created.id });
    expect(res).toEqual({ success: true });
  });

  it("ownership: cannot access other user's event sales", async () => {
    await expect(caller.sales.byEvent({ eventId: otherEventId })).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.sales.byEvent({ eventId: otherEventId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("ownership: cannot create sale for other user's event", async () => {
    await expect(
      caller.sales.create({
        eventId: otherEventId,
        platformId: seededPlatformId,
        ticketType: "VIP",
        quantity: 1,
        pricePerTicket: 100,
        fees: 0,
      }),
    ).rejects.toBeInstanceOf(TRPCError);

    await expect(
      caller.sales.create({
        eventId: otherEventId,
        platformId: seededPlatformId,
        ticketType: "VIP",
        quantity: 1,
        pricePerTicket: 100,
        fees: 0,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ownership: cannot delete other user's sale", async () => {
    await expect(caller.sales.delete({ id: otherSaleId })).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.sales.delete({ id: otherSaleId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
