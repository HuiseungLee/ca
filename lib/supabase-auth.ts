import { env } from "cloudflare:workers";
import { sharedAuthSessionFromCookieHeader } from "./shared-auth";

const DEFAULT_SUPABASE_URL = "https://supabase.lhsstart.synology.me";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg3NDYwMjEzLCJleHAiOjE5NDUxNDAyMTN9.l_GNRsIFQlkWggULNs4tCmSsLMqNJjjMKA6GjDGkUOQ";

export type SharedUserRole = "teacher" | "student";
export type SharedUser = { id: string; email: string; role: SharedUserRole; displayName: string; realName: string | null; nickname: string | null };
type AuthUser = { id?: string; email?: string; user_metadata?: { role?: string; real_name?: string; nickname?: string } };
type Profile = { role?: string; display_name?: string; real_name?: string; nickname?: string };
type PublicAuthConfig = { url: string; key: string };
let cachedRemoteConfig: { value: PublicAuthConfig; expiresAt: number } | undefined;

export function supabasePublicConfig() {
  return { url: env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") || DEFAULT_SUPABASE_URL, key: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY };
}

export function accountServiceUrl(): string {
  return (env.ACCOUNT_SERVICE_URL || "https://literature.lhsstart.synology.me").replace(/\/$/, "");
}

export async function resolvedSupabasePublicConfig(): Promise<PublicAuthConfig> {
  const direct = supabasePublicConfig();
  if (direct.url && direct.key) return direct;
  if (cachedRemoteConfig && cachedRemoteConfig.expiresAt > Date.now()) return cachedRemoteConfig.value;
  try {
    const response = await fetch(`${accountServiceUrl()}/api/auth/config`, { cache: "no-store" });
    const payload = await response.json() as Partial<PublicAuthConfig>;
    const value = { url: typeof payload.url === "string" ? payload.url.replace(/\/$/, "") : "", key: typeof payload.key === "string" ? payload.key : "" };
    if (response.ok && value.url && value.key) {
      cachedRemoteConfig = { value, expiresAt: Date.now() + 5 * 60 * 1000 };
      return value;
    }
  } catch {
    // The login screen reports that the central account service is unavailable.
  }
  return direct;
}

export async function getSharedUserFromRequest(request: Request): Promise<SharedUser | null> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const session = sharedAuthSessionFromCookieHeader(request.headers.get("cookie"));
  return getSharedUserFromToken(bearer ?? session?.access_token ?? "");
}

async function getSharedUserFromToken(token: string): Promise<SharedUser | null> {
  if (!token) return null;

  const accountServiceUser = await getSharedUserFromAccountService(token);
  if (accountServiceUser !== undefined) return accountServiceUser;

  const { url, key } = await resolvedSupabasePublicConfig();
  if (!url || !key) return null;
  try {
    const authResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!authResponse.ok) return null;
    const account = await authResponse.json() as AuthUser;
    if (!account.id || !account.email) return null;
    const profileResponse = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(account.id)}&select=role,display_name,real_name,nickname`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: "no-store" });
    const profiles = profileResponse.ok ? await profileResponse.json().catch(() => []) as Profile[] : [];
    const profile = Array.isArray(profiles) ? profiles[0] : undefined;
    const role = fixedRole(account.email) ?? normalizeRole(profile?.role) ?? (account.user_metadata?.role === "student" ? "student" : null);
    if (!role) return null;
    const realName = profile?.real_name ?? account.user_metadata?.real_name ?? null;
    const nickname = profile?.nickname ?? account.user_metadata?.nickname ?? null;
    return { id: account.id, email: account.email, role, realName, nickname, displayName: profile?.display_name ?? nickname ?? realName ?? account.email };
  } catch {
    return null;
  }
}

async function getSharedUserFromAccountService(token: string): Promise<SharedUser | null | undefined> {
  try {
    const response = await fetch(`${accountServiceUrl()}/api/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;
    const payload = await response.json() as { user?: unknown };
    if (!("user" in payload)) return undefined;
    if (payload.user === null) return null;
    if (!payload.user || typeof payload.user !== "object") return undefined;

    const user = payload.user as Partial<SharedUser>;
    const role = normalizeRole(user.role);
    if (typeof user.id !== "string" || typeof user.email !== "string" || !role) {
      return undefined;
    }
    const realName = typeof user.realName === "string" ? user.realName : null;
    const nickname = typeof user.nickname === "string" ? user.nickname : null;
    return {
      id: user.id,
      email: user.email,
      role,
      displayName: typeof user.displayName === "string" ? user.displayName : nickname ?? realName ?? user.email,
      realName,
      nickname,
    };
  } catch {
    return undefined;
  }
}

function fixedRole(email: string): SharedUserRole | null {
  const address = email.trim().toLowerCase();
  const teachers = (env.TEACHER_EMAILS || "lhsstart@gmail.com,admin@admin.com").split(",").map((value) => value.trim().toLowerCase());
  const students = (env.STUDENT_EMAILS || "stu01@st.com").split(",").map((value) => value.trim().toLowerCase());
  if (teachers.includes(address)) return "teacher";
  if (students.includes(address)) return "student";
  return null;
}

function normalizeRole(value?: string): SharedUserRole | null { return value === "teacher" || value === "student" ? value : null; }
