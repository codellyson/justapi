import { and, count, eq } from "drizzle-orm";
import { getDb } from "./db";
import { canvas, environment } from "../db/app-schema";
import { countsFromData } from "./canvas-counts";
import { getUserPlan, limitsFor } from "./plan";

export interface CanvasInput {
  id: string;
  name: string;
  data: string;
}
export interface EnvironmentInput {
  id: string;
  name: string;
  variables: string;
}

export async function listForUser(userId: string) {
  const db = await getDb();
  const [canvases, environments] = await Promise.all([
    db.select().from(canvas).where(eq(canvas.userId, userId)),
    db.select().from(environment).where(eq(environment.userId, userId)),
  ]);
  return { canvases, environments };
}

export type UpsertOutcome = "created" | "updated" | "forbidden" | "limit";

/** Ownership-safe upsert. A row whose id belongs to another user is never
 *  touched. `enforceCap` blocks *new* canvases past the plan limit (updates and
 *  bulk imports pass false so existing work is grandfathered). */
export async function upsertCanvas(
  userId: string,
  input: CanvasInput,
  enforceCap: boolean,
): Promise<UpsertOutcome> {
  const db = await getDb();
  const [row] = await db
    .select({ owner: canvas.userId })
    .from(canvas)
    .where(eq(canvas.id, input.id));
  if (row && row.owner !== userId) return "forbidden";

  const counts = countsFromData(input.data);
  if (!row) {
    if (enforceCap) {
      const [{ n }] = await db
        .select({ n: count() })
        .from(canvas)
        .where(eq(canvas.userId, userId));
      if (n >= limitsFor(getUserPlan(userId)).canvases) return "limit";
    }
    await db.insert(canvas).values({
      id: input.id,
      userId,
      name: input.name,
      data: input.data,
      ...counts,
    });
    return "created";
  }
  await db
    .update(canvas)
    .set({ name: input.name, data: input.data, ...counts, updatedAt: new Date() })
    .where(eq(canvas.id, input.id));
  return "updated";
}

export async function deleteCanvas(userId: string, id: string) {
  const db = await getDb();
  await db.delete(canvas).where(and(eq(canvas.id, id), eq(canvas.userId, userId)));
}

export async function upsertEnvironment(
  userId: string,
  input: EnvironmentInput,
): Promise<"ok" | "forbidden"> {
  const db = await getDb();
  const [row] = await db
    .select({ owner: environment.userId })
    .from(environment)
    .where(eq(environment.id, input.id));
  if (row && row.owner !== userId) return "forbidden";
  if (!row) {
    await db.insert(environment).values({
      id: input.id,
      userId,
      name: input.name,
      variables: input.variables,
    });
  } else {
    await db
      .update(environment)
      .set({ name: input.name, variables: input.variables, updatedAt: new Date() })
      .where(eq(environment.id, input.id));
  }
  return "ok";
}

export async function deleteEnvironment(userId: string, id: string) {
  const db = await getDb();
  await db
    .delete(environment)
    .where(and(eq(environment.id, id), eq(environment.userId, userId)));
}

type CanvasRow = { requestCount: number; collectionCount: number; assertCount: number };
export function usageFrom(canvases: CanvasRow[], environmentsLen: number) {
  return {
    canvases: canvases.length,
    requests: canvases.reduce((s, c) => s + (c.requestCount ?? 0), 0),
    collections: canvases.reduce((s, c) => s + (c.collectionCount ?? 0), 0),
    assertions: canvases.reduce((s, c) => s + (c.assertCount ?? 0), 0),
    environments: environmentsLen,
  };
}
