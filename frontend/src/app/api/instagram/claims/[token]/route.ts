import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { backendHeaders, backendUrl } from "@/lib/backend";

function getSessionUserId(sessionUser: unknown) {
  return (sessionUser as { id?: string } | undefined)?.id;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!getSessionUserId(session?.user)) {
    return NextResponse.json({ status: "error", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ status: "error", code: "INVALID_CLAIM" }, { status: 400 });
  }

  try {
    const response = await fetch(
      backendUrl(`/api/instagram/claims/${encodeURIComponent(token)}`),
      { headers: backendHeaders(), cache: "no-store" },
    );
    const body = await response.text();
    if (!body) {
      return NextResponse.json(
        { status: "error", code: "BACKEND_EMPTY_RESPONSE" },
        { status: response.status || 502 },
      );
    }
    try {
      return NextResponse.json(JSON.parse(body), { status: response.status });
    } catch {
      return NextResponse.json(
        { status: "error", code: "BACKEND_BAD_RESPONSE" },
        { status: response.status || 502 },
      );
    }
  } catch {
    return NextResponse.json(
      { status: "error", code: "BACKEND_UNREACHABLE" },
      { status: 502 },
    );
  }
}
