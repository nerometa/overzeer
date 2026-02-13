import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { createId } from "@paralleldrive/cuid2";

import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:../../local.db",
});

const db = drizzle({ client, schema });

async function seed() {
  console.log("Seeding database...");

  const platformData = [
    { id: createId(), name: "Megatix", apiEnabled: false, colorHex: "#FF6B6B" },
    { id: createId(), name: "Ticketmelon", apiEnabled: false, colorHex: "#4ECDC4" },
    { id: createId(), name: "Resident Advisor", apiEnabled: false, colorHex: "#95E1D3" },
    { id: createId(), name: "At Door", apiEnabled: false, colorHex: "#F38181" },
  ];

  await db.insert(schema.platforms).values(platformData);
  console.log("  Platforms seeded");

  const userId = createId();
  await db.insert(schema.user).values({
    id: userId,
    name: "Demo User",
    email: "demo@overzeer.dev",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("  Demo user seeded");

  const now = new Date();
  const eventData = [
    {
      id: createId(),
      userId,
      name: "Neon Nights Festival",
      date: "2026-03-15",
      venue: "Warehouse 808, Bangkok",
      totalCapacity: 500,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      userId,
      name: "Sunset Sessions Vol. 4",
      date: "2026-04-20",
      venue: "Rooftop Bar, Sukhumvit",
      totalCapacity: 200,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      userId,
      name: "Underground Collective",
      date: "2026-05-10",
      venue: "The Basement, Thonglor",
      totalCapacity: 150,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.insert(schema.events).values(eventData);
  console.log("  Events seeded");

  const ticketTypes = ["Early Bird", "General Admission", "VIP"];
  const salesData = [];

  for (const event of eventData) {
    for (const platform of platformData) {
      if (platform.name === "At Door") continue;

      for (const ticketType of ticketTypes) {
        const basePrice =
          ticketType === "Early Bird" ? 500 : ticketType === "VIP" ? 2000 : 800;
        const quantity = Math.floor(Math.random() * 30) + 5;
        const daysAgo = Math.floor(Math.random() * 30);

        salesData.push({
          id: createId(),
          eventId: event.id,
          platformId: platform.id,
          ticketType,
          quantity,
          pricePerTicket: basePrice,
          fees: basePrice * quantity * 0.05,
          saleDate: new Date(now.getTime() - daysAgo * 86400000),
          syncedAt: now,
        });
      }
    }
  }

  await db.insert(schema.sales).values(salesData);
  console.log(`  ${salesData.length} sales records seeded`);

  const manualSalesData = eventData.map((event) => ({
    id: createId(),
    eventId: event.id,
    entryTime: now,
    quantity: Math.floor(Math.random() * 20) + 5,
    totalAmount: (Math.floor(Math.random() * 20) + 5) * 800,
    notes: "Walk-in sales",
    createdBy: userId,
    createdAt: now,
  }));

  await db.insert(schema.manualSales).values(manualSalesData);
  console.log("  Manual sales seeded");

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
