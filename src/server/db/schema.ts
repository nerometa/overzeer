import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({ userIdIdx: index("session_userId_idx").on(table.userId) }),
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({ userIdIdx: index("account_userId_idx").on(table.userId) }),
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({ identifierIdx: index("verification_identifier_idx").on(table.identifier) }),
);

export const platforms = sqliteTable("platforms", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  apiEnabled: integer("api_enabled", { mode: "boolean" }).default(false),
  colorHex: text("color_hex"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    date: text("date").notNull(),
    venue: text("venue"),
    totalCapacity: integer("total_capacity"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index("events_userId_idx").on(table.userId),
    dateIdx: index("events_date_idx").on(table.date),
  }),
);

export const sales = sqliteTable(
  "sales",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    platformId: text("platform_id").references(() => platforms.id),
    ticketType: text("ticket_type"),
    quantity: integer("quantity").notNull(),
    pricePerTicket: real("price_per_ticket").notNull(),
    fees: real("fees").default(0),
    saleDate: integer("sale_date", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => ({
    eventIdIdx: index("sales_eventId_idx").on(table.eventId),
    platformIdIdx: index("sales_platformId_idx").on(table.platformId),
    saleDateIdx: index("sales_saleDate_idx").on(table.saleDate),
  }),
);

export const projections = sqliteTable("projections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  projectedTotal: real("projected_total"),
  confidenceLevel: text("confidence_level"),
  calculationDate: integer("calculation_date", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const manualSales = sqliteTable(
  "manual_sales",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    entryTime: integer("entry_time", { mode: "timestamp_ms" }).notNull(),
    quantity: integer("quantity").notNull(),
    totalAmount: real("total_amount").notNull(),
    notes: text("notes"),
    createdBy: text("created_by").references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => ({
    eventIdIdx: index("manualSales_eventId_idx").on(table.eventId),
    createdByIdx: index("manualSales_createdBy_idx").on(table.createdBy),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  events: many(events),
  manualSales: many(manualSales),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(user, {
    fields: [events.userId],
    references: [user.id],
  }),
  sales: many(sales),
  projections: many(projections),
  manualSales: many(manualSales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  event: one(events, {
    fields: [sales.eventId],
    references: [events.id],
  }),
  platform: one(platforms, {
    fields: [sales.platformId],
    references: [platforms.id],
  }),
}));

export const projectionsRelations = relations(projections, ({ one }) => ({
  event: one(events, {
    fields: [projections.eventId],
    references: [events.id],
  }),
}));

export const manualSalesRelations = relations(manualSales, ({ one }) => ({
  event: one(events, {
    fields: [manualSales.eventId],
    references: [events.id],
  }),
  createdByUser: one(user, {
    fields: [manualSales.createdBy],
    references: [user.id],
  }),
}));
