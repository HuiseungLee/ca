import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { resolvedSupabasePublicConfig } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigins = new Set([
    new URL(request.url).origin,
    "https://ca.lhsstart.synology.me",
  ]);
  if (origin && !allowedOrigins.has(origin))
    return Response.json(
      { error: "같은 사이트에서 다시 시도해 주세요." },
      { status: 403 },
    );
  try {
    const authenticated = await requireProfile(request);
    if (!authenticated)
      return Response.json({ error: "다시 로그인해 주세요." }, { status: 401 });
    const parsed = z
      .object({
        currentPassword: z.string().min(1).max(256),
        newPassword: z.string().min(8).max(256),
      })
      .safeParse(await request.json());
    if (!parsed.success)
      return Response.json(
        { error: "현재 비밀번호와 8자 이상의 새 비밀번호를 입력해 주세요." },
        { status: 400 },
      );
    const { url, key } = await resolvedSupabasePublicConfig();
    const verification = await fetch(
      `${url}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: key, "content-type": "application/json" },
        body: JSON.stringify({
          email: authenticated.profile.email,
          password: parsed.data.currentPassword,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const session = (await verification.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      user?: { id?: string };
    };
    if (
      !verification.ok ||
      !session.access_token ||
      session.user?.id !== authenticated.profile.id
    )
      return Response.json(
        { error: "현재 비밀번호를 확인해 주세요." },
        { status: 400 },
      );
    const updated = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: key,
        Authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: parsed.data.newPassword,
        current_password: parsed.data.currentPassword,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!updated.ok)
      return Response.json(
        {
          error:
            "비밀번호를 바꾸지 못했습니다. 이전과 다른 비밀번호를 사용하거나 잠시 후 다시 시도해 주세요.",
        },
        { status: 400 },
      );
    return Response.json(
      {
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "계정 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }
}
