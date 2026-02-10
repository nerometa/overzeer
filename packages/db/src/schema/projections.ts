import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

import { events } from "./events";

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

export const projectionsRelations = relations(projections, ({ one }) => ({
  event: one(events, {
    fields: [projections.eventId],
    references: [events.id],
  }),
}));
