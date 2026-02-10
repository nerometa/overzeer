import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";

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
const { user, events } = schema;

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

describe("events router", () => {
  let demoUser: Awaited<ReturnType<typeof getDemoUser>>;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let seededEventId: string;
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    demoUser = await getDemoUser();
    const ctx = ctxForUser(demoUser.id, demoUser.email, demoUser.name);
    caller = appRouter.createCaller(ctx);

    const seeded = await db.query.events.findFirst({
      where: eq(events.userId, demoUser.id),
      columns: { id: true },
    });
    if (!seeded?.id) throw new Error("No seeded event found for demo user");
    seededEventId = seeded.id;
  });

  afterAll(async () => {
    // Clean up any events created during tests (if not already deleted).
    for (const id of createdEventIds) {
      await db.delete(events).where(and(eq(events.id, id), eq(events.userId, demoUser.id)));
    }
  });

  it("list: returns events for the authenticated user", async () => {
    const res = await caller.events.list();
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBeGreaterThan(0);
    for (const e of res) {
      expect(e.userId).toBe(demoUser.id);
    }
  });

  it("byId: returns event with relations (sales, projections)", async () => {
    const res = await caller.events.byId({ id: seededEventId });
    expect(res.id).toBe(seededEventId);
    expect(res.userId).toBe(demoUser.id);

    expect(Array.isArray(res.sales)).toBe(true);
    expect(res.sales.length).toBeGreaterThan(0);

    expect(Array.isArray(res.projections)).toBe(true);
    expect(Array.isArray(res.manualSales)).toBe(true);
  });

  it("byId with wrong ID: throws NOT_FOUND", async () => {
    await expect(caller.events.byId({ id: "evt_missing" })).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.events.byId({ id: "evt_missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("create: creates event and returns it with id", async () => {
    const created = await caller.events.create({
      name: `Test Event ${Date.now()}`,
      date: "2026-12-31",
      venue: "Test Venue",
      totalCapacity: 123,
    });

    createdEventIds.push(created.id);
    expect(created.id).toBeTruthy();
    expect(created.userId).toBe(demoUser.id);
    expect(created.name).toContain("Test Event");
  });

  it("update: updates event fields", async () => {
    const created = await caller.events.create({
      name: `Update Me ${Date.now()}`,
      date: "2026-11-11",
      venue: "Old Venue",
      totalCapacity: 50,
    });
    createdEventIds.push(created.id);

    const updated = await caller.events.update({
      id: created.id,
      name: "Updated Name",
      venue: null,
      totalCapacity: 99,
    });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Updated Name");
    expect(updated.venue).toBeNull();
    expect(updated.totalCapacity).toBe(99);
  });

  it("delete: deletes event, returns { success: true }", async () => {
    const created = await caller.events.create({
      name: `Delete Me ${Date.now()}`,
      date: "2026-10-10",
    });
    createdEventIds.push(created.id);

    const res = await caller.events.delete({ id: created.id });
    expect(res).toEqual({ success: true });

    // Remove from cleanup list since it is already deleted.
    const idx = createdEventIds.indexOf(created.id);
    if (idx >= 0) createdEventIds.splice(idx, 1);
  });

  it("delete nonexistent: throws NOT_FOUND", async () => {
    await expect(caller.events.delete({ id: "evt_missing" })).rejects.toBeInstanceOf(TRPCError);
    await expect(caller.events.delete({ id: "evt_missing" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
