import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { backendHeaders, backendUrl } from "@/lib/backend";

interface PlaceBody {
  name?: string;
  address?: string;
  category?: string;
  rating?: number;
  summary?: string;
}

function getSessionUserId(sessionUser: unknown) {
  return (sessionUser as { id?: string } | undefined)?.id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session?.user);

  if (!userId) {
    return NextResponse.json({ status: "error", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const response = await fetch(
      backendUrl(`/api/places?user_id=${encodeURIComponent(userId)}`),
      {
        headers: backendHeaders(),
        cache: "no-store",
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNREACHABLE",
        message: "저장된 장소를 불러오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session?.user);

  if (!userId) {
    return NextResponse.json({ status: "error", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await request.json()) as PlaceBody;
  if (!body.name?.trim() || !body.address?.trim()) {
    return NextResponse.json(
      {
        status: "error",
        code: "INVALID_PLACE",
        message: "장소명과 주소가 필요합니다.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(backendUrl("/api/places"), {
      method: "POST",
      headers: backendHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        user_id: userId,
        name: body.name,
        address: body.address,
        category: body.category,
        rating: body.rating,
        summary: body.summary,
      }),
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNREACHABLE",
        message: "장소 저장 서버에 연결하지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
