import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTodo, updateTodo, deleteTodo } from "../../store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const parseId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
};

/** GET /api/sample/todos/:id (bearer required). */
export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  const todo = id === null ? null : getTodo(id);
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(todo);
}

/** PUT /api/sample/todos/:id — update title/completed (bearer required). */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  let body: { title?: string; completed?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }
  const todo = id === null ? null : updateTodo(id, body);
  if (!todo) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(todo);
}

/** DELETE /api/sample/todos/:id (bearer required). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const id = parseId((await params).id);
  const ok = id !== null && deleteTodo(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ deleted: id });
}
