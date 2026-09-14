export const SHARED_AUTH_COOKIE_NAME = "lhsstart_auth";

const SHARED_AUTH_DOMAIN = "lhsstart.synology.me";
const SHARED_AUTH_MAX_AGE = 60 * 60 * 24 * 30;

export type SharedAuthSession = { access_token: string; refresh_token?: string; expires_at?: number };
type AuthPayload = { access_token?: unknown; refresh_token?: unknown; expires_at?: unknown; expires_in?: unknown };

export function parseSharedAuthSession(value?: string | null): SharedAuthSession | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as AuthPayload;
    if (typeof parsed.access_token !== "string" || !parsed.access_token) return null;
    return {
      access_token: parsed.access_token,
      ...(typeof parsed.refresh_token === "string" && parsed.refresh_token ? { refresh_token: parsed.refresh_token } : {}),
      ...(Number.isFinite(Number(parsed.expires_at)) ? { expires_at: Number(parsed.expires_at) } : {}),
    };
  } catch { return null; }
}

export function sharedAuthSessionFromCookieHeader(cookieHeader?: string | null): SharedAuthSession | null {
  const value = cookieHeader?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SHARED_AUTH_COOKIE_NAME}=`))?.slice(SHARED_AUTH_COOKIE_NAME.length + 1);
  return parseSharedAuthSession(value);
}

export function readSharedAuthSession(): SharedAuthSession | null {
  if (typeof document === "undefined") return null;
  return sharedAuthSessionFromCookieHeader(document.cookie);
}

export function saveSharedAuthSession(payload: AuthPayload, previous?: SharedAuthSession | null): SharedAuthSession {
  if (typeof payload.access_token !== "string" || !payload.access_token) throw new Error("로그인 정보를 저장하지 못했습니다.");
  const expiresIn = Number(payload.expires_in); const expiresAt = Number(payload.expires_at);
  const session: SharedAuthSession = {
    access_token: payload.access_token,
    ...(typeof payload.refresh_token === "string" && payload.refresh_token ? { refresh_token: payload.refresh_token } : previous?.refresh_token ? { refresh_token: previous.refresh_token } : {}),
    ...(Number.isFinite(expiresAt) && expiresAt > 0 ? { expires_at: expiresAt } : Number.isFinite(expiresIn) && expiresIn > 0 ? { expires_at: Math.floor(Date.now() / 1000) + expiresIn } : {}),
  };
  writeCookie(encodeURIComponent(JSON.stringify(session)), SHARED_AUTH_MAX_AGE);
  return session;
}

export function clearSharedAuthSession(): void {
  if (typeof document === "undefined") return;
  writeCookie("", 0);
  document.cookie = `${SHARED_AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function restoreSharedAuthSession(supabaseUrl: string, publishableKey: string): Promise<SharedAuthSession | null> {
  const session = readSharedAuthSession();
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || session.expires_at > now + 60) return session;
  if (!session.refresh_token) { clearSharedAuthSession(); return null; }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST", headers: { apikey: publishableKey, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const payload = await response.json().catch(() => ({})) as AuthPayload;
    if (!response.ok) throw new Error("세션을 갱신하지 못했습니다.");
    return saveSharedAuthSession(payload, session);
  } catch { clearSharedAuthSession(); return null; }
}

function writeCookie(value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  const hostname = window.location.hostname.toLowerCase();
  const sharedDomain = hostname === SHARED_AUTH_DOMAIN || hostname.endsWith(`.${SHARED_AUTH_DOMAIN}`);
  const secure = window.location.protocol === "https:";
  document.cookie = [`${SHARED_AUTH_COOKIE_NAME}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax", ...(sharedDomain ? [`Domain=${SHARED_AUTH_DOMAIN}`] : []), ...(secure ? ["Secure"] : [])].join("; ");
}
