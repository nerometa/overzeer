import { Elysia } from "elysia";
import { db, schema } from "../db";
import { asc } from "drizzle-orm";

const { platforms } = schema;

export const platformsRoutes = new Elysia({ prefix: "/platforms" })
  // GET /api/platforms - list all platforms (public)
  .get(
    "/",
    async () => {
      return db.query.platforms.findMany({
        orderBy: asc(platforms.name),
      });
    },
    {
      detail: {
        tags: ["platforms"],
        summary: "List all platforms",
      },
    }
  );
