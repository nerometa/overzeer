import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

import { events } from "./events";
import { user } from "./auth";

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
  (table) => [
    index("manualSales_eventId_idx").on(table.eventId),
    index("manualSales_createdBy_idx").on(table.createdBy),
  ],
);

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
