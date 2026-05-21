import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { backendHeaders, backendUrl } from "@/lib/backend";

function getSessionUserId(sessionUser: unknown) {
  return (sessionUser as { id?: string } | undefined)?.id;
}

export async function POST() {
  // 1. NextAuth 세션을 통한 로그인 유저 인증 확인
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session?.user);

  if (!userId) {
    return NextResponse.json(
      { status: "error", code: "UNAUTHORIZED", message: "로그인이 필요한 서비스입니다." },
      { status: 401 },
    );
  }

  try {
    // 2. 내부 보안 인증 헤더를 동봉하여 백엔드 FastAPI 서버의 복구 API로 요청 위임(Proxying)
    const response = await fetch(backendUrl("/api/places/recover-coordinates"), {
      method: "POST",
      headers: backendHeaders({ "Content-Type": "application/json" }),
      cache: "no-store",
    });

    const bodyText = await response.text();

    if (!bodyText) {
      return NextResponse.json(
        {
          status: "error",
          code: "BACKEND_EMPTY_RESPONSE",
          message: `백엔드 응답이 비어있습니다. (HTTP ${response.status})`,
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
          message: `백엔드 응답 파싱에 실패했습니다. (HTTP ${response.status})`,
        },
        { status: response.status || 502 },
      );
    }
  } catch (error) {
    console.error("Failed to proxy coordinates recovery request:", error);
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNREACHABLE",
        message: "백엔드 복구 서버에 연결하지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
