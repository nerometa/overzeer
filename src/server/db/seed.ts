import { db } from "./index";
import { platforms } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  const existing = await db.select().from(platforms);
  if (existing.length > 0) {
    console.log("✅ Platforms already seeded");
    return;
  }

  await db.insert(platforms).values([
    { id: "1", name: "Megatix", apiEnabled: false, colorHex: "#FF6B6B" },
    { id: "2", name: "Ticketmelon", apiEnabled: false, colorHex: "#4ECDC4" },
    { id: "3", name: "Resident Advisor", apiEnabled: false, colorHex: "#95E1D3" },
    { id: "4", name: "At-Door", apiEnabled: false, colorHex: "#F38181" },
  ]);

  console.log("✅ Seed complete");
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
