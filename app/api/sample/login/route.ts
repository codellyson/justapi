import { NextRequest, NextResponse } from "next/server";
import { issueToken } from "../store";

export const dynamic = "force-dynamic";

/** POST /api/sample/login — any non-empty username/password is accepted
 *  (it's a demo) and returns a bearer token for the protected routes. */
export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty/invalid body */
  }
  if (!body.username || !body.password) {
    return NextResponse.json(
      { error: "username and password are required" },
      { status: 400 }
    );
  }
  return NextResponse.json({
    access_token: issueToken(),
    token_type: "Bearer",
    expires_in: 3600,
    user: { username: body.username },
  });
}
