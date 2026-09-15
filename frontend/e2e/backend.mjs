// Loopback-only contract fixture; never deployed with the app.
import http from "node:http";
let records = [];
let nextId = 1;
let failedOnce = false;
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:3101");
  const send = (status, body) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(JSON.stringify(body)); };
  if (url.pathname === "/health") return send(200, { status: "ok" });
  if (request.headers["x-sple-internal-key"] !== "e2e-internal-key") return send(401, {});
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  if (url.pathname === "/reset") { records = []; nextId = 1; failedOnce = false; return send(200, {}); }
  if (url.pathname === "/api/analyze") {
    if (body.text === "AI 장애") return send(503, { detail: { code: "AI_UNAVAILABLE", message: "AI 서비스에 일시적인 문제가 있습니다." } });
    return send(200, { status: "success", data: [
      { name: "테스트 카페", address: "", category: "Cafe", summary: "조용한 카페" },
      { name: "재시도 식당", address: "", category: "Dining", summary: "맛있는 식당" },
    ] });
  }
  if (url.pathname === "/api/places/recover-coordinates") return send(200, { user_id: body.user_id });
  if (url.pathname === "/api/places" && request.method === "GET") return send(200, { status: "success", data: records.filter(place => place.user_id === url.searchParams.get("user_id")) });
  if (url.pathname === "/api/places" && request.method === "POST") {
    if (body.name === "재시도 식당" && !failedOnce) { failedOnce = true; return send(503, { message: "일시적인 저장 오류" }); }
    let place = records.find(place => place.request_id === body.request_id && place.user_id === body.user_id);
    if (!place) { place = { ...body, id: nextId++ }; records.push(place); }
    return send(200, { status: "success", data: place });
  }
  send(404, {});
});
server.listen(3101, "127.0.0.1");
