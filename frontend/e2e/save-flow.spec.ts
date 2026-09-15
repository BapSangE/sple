import { expect, test, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";

async function login(context: BrowserContext, sub = "test-owner") {
  const value = await encode({ token: { sub, name: "테스트 사용자" }, secret: "e2e-only-session-secret" });
  await context.addCookies([{ name: "next-auth.session-token", value, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
}

test.beforeEach(async ({ page, request }) => {
  await request.post("http://127.0.0.1:3101/reset", { headers: { "x-sple-internal-key": "e2e-internal-key" } });
  await page.route(/https:\/\//, route => route.abort());
  page.on("dialog", dialog => dialog.accept());
});

test("login return preserves analysis and partial save retries only failed places", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/add");
  await page.getByRole("textbox").fill("성수동의 카페와 식당 소개");
  await page.getByRole("button", { name: "AI 분석하기" }).click();
  await expect(page.getByRole("heading", { name: "테스트 카페" })).toBeVisible();
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem("sple-place-draft-v1")!).places);
  // Simulate the OAuth provider's return, retaining real NextAuth session verification.
  await page.route("**/api/auth/signin/google", async route => {
    expect(route.request().postData()).toContain("callbackUrl=%2Fadd");
    await login(context);
    await route.fulfill({ json: { url: "http://127.0.0.1:3100/add?oauth-test=1" } });
  });
  await page.getByRole("button", { name: "로그인하고 저장 이어하기" }).click();
  await expect(page.getByRole("button", { name: "선택 저장 (2)" })).toBeVisible();
  await page.getByRole("button", { name: "선택 저장 (2)" }).click();
  await expect(page.getByRole("heading", { name: "테스트 카페 · 저장 완료" })).toBeVisible();
  await expect(page.getByRole("button", { name: "선택 저장 (1)" })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("button", { name: "선택 저장 (1)" })).toBeVisible();
  await page.screenshot({ path: "test-results/save-retry-mobile.png", fullPage: true });
  const after = await page.evaluate(() => JSON.parse(sessionStorage.getItem("sple-place-draft-v1")!).places);
  expect(after.map((place: {request_id: string}) => place.request_id)).toEqual(before.map((place: {request_id: string}) => place.request_id));
  await page.getByRole("button", { name: "선택 저장 (1)" }).click();
  await expect(page).toHaveURL(/\/saved$/);
  const response = await page.request.get("/api/places");
  expect((await response.json()).data).toHaveLength(2);
  expect(await page.evaluate(() => sessionStorage.getItem("sple-place-draft-v1"))).toBeNull();
  expect(errors).toEqual([]);
});

test("proxy requires a session and ignores client-supplied recovery owner", async ({ page, context }) => {
  expect((await page.request.post("/api/places/recover-coordinates")).status()).toBe(401);
  await login(context);
  const response = await page.request.post("/api/places/recover-coordinates", { data: { user_id: "other-user" } });
  expect(await response.json()).toEqual({ user_id: "test-owner" });
});

test("AI service failure is displayed without blaming the input", async ({ page }) => {
  await page.goto("/add");
  await page.getByRole("textbox").fill("AI 장애");
  await page.getByRole("button", { name: "AI 분석하기" }).click();
  await expect(page.getByText("AI 서비스에 일시적인 문제가 있습니다.")).toBeVisible();
});

test("another account does not inherit an owned draft", async ({ page, context }) => {
  await login(context, "first-owner");
  await page.goto("/add");
  await page.getByRole("textbox").fill("내 장소");
  await page.getByRole("button", { name: "AI 분석하기" }).click();
  await expect(page.getByRole("heading", { name: "테스트 카페" })).toBeVisible();
  await login(context, "second-owner");
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue("");
});
