import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./schema";

// App-owned tables. Kept separate from schema.ts because `pnpm auth:generate`
// regenerates schema.ts wholesale and would otherwise wipe these.

/** One canvas (a client "graph") per row. `data` is the JSON blob the client
 *  persists — nodes/edges/viewport — with counts denormalized for cheap usage
 *  aggregates. `id` matches the client-generated graph id. */
export const canvas = sqliteTable(
  "canvas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    data: text("data").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    collectionCount: integer("collection_count").notNull().default(0),
    assertCount: integer("assert_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("canvas_userId_idx").on(table.userId)],
);

export const environment = sqliteTable(
  "environment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    variables: text("variables").notNull().default("{}"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("environment_userId_idx").on(table.userId)],
);
