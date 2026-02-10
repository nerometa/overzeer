import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

import { user } from "./auth";
import { sales } from "./sales";
import { projections } from "./projections";
import { manualSales } from "./manualSales";

export const events = sqliteTable(
  "events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    date: text("date").notNull(), // ISO 8601 date string
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
  (table) => [
    index("events_userId_idx").on(table.userId),
    index("events_date_idx").on(table.date),
  ],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(user, {
    fields: [events.userId],
    references: [user.id],
  }),
  sales: many(sales),
  projections: many(projections),
  manualSales: many(manualSales),
}));
