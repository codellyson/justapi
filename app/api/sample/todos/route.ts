import { NextRequest, NextResponse } from "next/server";
import { requireAuth, listTodos, createTodo } from "../store";

export const dynamic = "force-dynamic";

/** GET /api/sample/todos — list todos (bearer required). */
export async function GET(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  return NextResponse.json(listTodos());
}

/** POST /api/sample/todos — create a todo (bearer required). */
export async function POST(req: NextRequest) {
  const denied = requireAuth(req);
  if (denied) return denied;
  let body: { title?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  return NextResponse.json(createTodo(body.title), { status: 201 });
}
