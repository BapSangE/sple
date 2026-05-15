import { NextResponse } from "next/server";
import { backendHeaders, backendUrl } from "@/lib/backend";

interface AnalyzeBody {
  text?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyzeBody;
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json(
      {
        status: "error",
        code: "TEXT_REQUIRED",
        message: "장소가 언급된 텍스트를 복사해 붙여넣어 주세요.",
      },
      { status: 400 },
    );
  }

  const response = await fetch(backendUrl("/api/analyze"), {
    method: "POST",
    headers: backendHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text }),
    cache: "no-store",
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
