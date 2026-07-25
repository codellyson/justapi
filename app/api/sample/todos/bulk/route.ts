import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createTodo } from "../../store";

export const dynamic = "force-dynamic";

/** POST /api/sample/todos/bulk — create several todos at once (bearer
 *  required). Body: { titles: string[] }. Returns { created, ids }. */
export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;

  let body: { titles?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const titles = Array.isArray(body.titles) ? body.titles : [];
  if (titles.length === 0) {
    return NextResponse.json(
      { error: "titles must be a non-empty array" },
      { status: 400 }
    );
  }

  const ids: number[] = [];
  for (let i = 0; i < titles.length; i++) {
    ids.push(createTodo(titles[i]).id);
  }

  return NextResponse.json({ created: ids.length, ids }, { status: 201 });
}
