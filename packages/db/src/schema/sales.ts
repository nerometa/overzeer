import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

import { events } from "./events";
import { platforms } from "./platforms";

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
  (table) => [
    index("sales_eventId_idx").on(table.eventId),
    index("sales_platformId_idx").on(table.platformId),
    index("sales_saleDate_idx").on(table.saleDate),
  ],
);

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
