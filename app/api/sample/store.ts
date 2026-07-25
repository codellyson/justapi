import { NextResponse } from "next/server";

/**
 * In-memory backend for the sample API — a tiny auth + todos service so
 * flows have a real, stateful target with a login → token → protected
 * routes shape (perfect for showing off captures/bindings and asserts).
 * State lives on globalThis so it survives dev HMR; it resets when the
 * server restarts (it's a demo, not a database).
 */
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

interface SampleStore {
  tokens: Set<string>;
  todos: Map<number, Todo>;
  seq: number;
}

const g = globalThis as unknown as { __justapiSampleStore?: SampleStore };
export const store: SampleStore = (g.__justapiSampleStore ??= {
  tokens: new Set<string>(),
  todos: new Map<number, Todo>(),
  seq: 1,
});

export const issueToken = (): string => {
  const token = `demo_${Math.random().toString(36).slice(2, 12)}`;
  store.tokens.add(token);
  return token;
};

/** Bearer-token gate. Returns a 401 response when the token is missing or
 *  unknown, or null when the caller is authorized. */
export const requireAuth = (req: Request): NextResponse | null => {
  const header = req.headers.get("authorization");
  const match = header ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;
  if (match && store.tokens.has(match[1])) return null;
  return NextResponse.json(
    { error: "missing or invalid bearer token" },
    { status: 401 }
  );
};

export const createTodo = (title: string): Todo => {
  const id = store.seq++;
  const todo: Todo = { id, title, completed: false };
  store.todos.set(id, todo);
  return todo;
};

export const listTodos = (): Todo[] => [...store.todos.values()];
export const getTodo = (id: number): Todo | null => store.todos.get(id) ?? null;

export const updateTodo = (
  id: number,
  patch: Partial<Omit<Todo, "id">>
): Todo | null => {
  const todo = store.todos.get(id);
  if (!todo) return null;
  if (typeof patch.title === "string") todo.title = patch.title;
  if (typeof patch.completed === "boolean") todo.completed = patch.completed;
  return todo;
};

export const deleteTodo = (id: number): boolean => store.todos.delete(id);
