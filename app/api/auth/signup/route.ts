import { accountServiceUrl } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const accountService = accountServiceUrl();
  try {
    const response = await fetch(`${accountService}/api/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: await request.text() });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });
  } catch { return Response.json({ error: "공통 회원가입 서비스에 연결하지 못했습니다." }, { status: 503 }); }
}
