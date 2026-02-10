import { db, schema } from "@overzeer/db";
const { platforms } = schema;
import { asc } from "drizzle-orm";

import { publicProcedure, router } from "../index";

export const platformsRouter = router({
  list: publicProcedure.query(async () => {
    return db.query.platforms.findMany({
      orderBy: asc(platforms.name),
    });
  }),
});
