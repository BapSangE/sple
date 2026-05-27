import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { backendHeaders, backendUrl } from "@/lib/backend";

function getSessionUserId(sessionUser: unknown) {
  return (sessionUser as { id?: string } | undefined)?.id;
}

async function forwardBackendJson(response: Response) {
  const bodyText = await response.text();

  if (!bodyText) {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_EMPTY_RESPONSE",
        message: `네이버 장소 정보를 확인하지 못했습니다. (HTTP ${response.status})`,
      },
      { status: response.status || 502 },
    );
  }

  try {
    return NextResponse.json(JSON.parse(bodyText), { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_BAD_RESPONSE",
        message: `네이버 장소 정보 응답을 해석하지 못했습니다. (HTTP ${response.status})`,
      },
      { status: response.status || 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session?.user);

  if (!userId) {
    return NextResponse.json({ status: "error", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: number;
    force?: boolean;
  } | null;

  if (!body?.id) {
    return NextResponse.json(
      {
        status: "error",
        code: "INVALID_REQUEST",
        message: "장소 ID가 필요합니다.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(backendUrl(`/api/places/${body.id}/enrich`), {
      method: "POST",
      headers: backendHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        user_id: userId,
        force: Boolean(body.force),
      }),
      cache: "no-store",
    });

    return forwardBackendJson(response);
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNREACHABLE",
        message: "네이버 장소 정보를 확인할 서버에 연결하지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
