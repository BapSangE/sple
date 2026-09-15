import { NextResponse } from "next/server";
import { backendHeaders, backendUrl } from "@/lib/backend";

interface AnalyzeBody {
  text?: unknown;
}

async function forwardBackendJson(response: Response) {
  const bodyText = await response.text();

  if (!bodyText) {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_EMPTY_RESPONSE",
        message: `장소 분석 서버가 빈 응답을 반환했습니다. (HTTP ${response.status})`,
      },
      { status: response.ok ? 502 : response.status },
    );
  }

  try {
    return NextResponse.json(JSON.parse(bodyText), { status: response.status });
  } catch {
    console.error("Backend returned a non-JSON analyze response", {
      status: response.status,
      body: bodyText.slice(0, 500),
    });

    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_BAD_RESPONSE",
        message: `장소 분석 서버 응답을 처리하지 못했습니다. (HTTP ${response.status})`,
      },
      { status: response.ok ? 502 : response.status },
    );
  }
}

export async function POST(request: Request) {
  let body: AnalyzeBody;

  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "INVALID_JSON",
        message: "요청 형식이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text || text.length > 10_000) {
    return NextResponse.json(
      {
        status: "error",
        code: "TEXT_REQUIRED",
        message: "장소가 언급된 텍스트를 10,000자 이내로 붙여넣어 주세요.",
      },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(backendUrl("/api/analyze"), {
      method: "POST",
      headers: backendHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });

    return await forwardBackendJson(response);
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "BACKEND_UNREACHABLE",
        message: "장소 분석 서버에 연결하지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
