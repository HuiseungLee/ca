import { accountServiceUrl } from "@/lib/supabase-auth";
import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && ![new URL(request.url).origin, env.PUBLIC_SITE_URL].includes(origin))) {
    return Response.json({ error: "같은 사이트에서 가입해 주세요." }, { status: 403 });
  }
  const accountService = accountServiceUrl();
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 16384) return Response.json({ error: "요청이 너무 큽니다." }, { status: 413 });
    const response = await fetch(`${accountService}/api/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(20000) });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });
  } catch { return Response.json({ error: "공통 회원가입 서비스에 연결하지 못했습니다." }, { status: 503 }); }
}
