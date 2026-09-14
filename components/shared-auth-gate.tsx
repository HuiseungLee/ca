"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { clearSharedAuthSession, restoreSharedAuthSession, saveSharedAuthSession, type SharedAuthSession } from "@/lib/shared-auth";

export type SharedAccount = { id: string; email: string; role: "teacher" | "student"; displayName: string; realName: string | null; nickname: string | null };
type AuthConfig = { configured: boolean; url: string; key: string };
type Mode = "login" | "signup" | "verify";

export function SharedAuthGate({ children }: { children: (account: SharedAccount, logout: () => void) => ReactNode }) {
  const [account, setAccount] = useState<SharedAccount | null>();
  const [config, setConfig] = useState<AuthConfig>();
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [realName, setRealName] = useState(""); const [nickname, setNickname] = useState("");
  const [teacherInviteCode, setTeacherInviteCode] = useState(""); const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);

  async function loadAccount(session: SharedAuthSession) {
    const response = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const data = await response.json().catch(() => ({ user: null })) as { user: SharedAccount | null };
    setAccount(data.user);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/config", { cache: "no-store" }).then((response) => response.json() as Promise<AuthConfig>).then(async (nextConfig) => {
      if (!active) return;
      setConfig(nextConfig);
      if (!nextConfig.configured) { setAccount(null); return; }
      const session = await restoreSharedAuthSession(nextConfig.url, nextConfig.key);
      if (!active) return;
      if (session) await loadAccount(session); else setAccount(null);
    }).catch(() => { if (active) { setAccount(null); setMessage("공통 로그인 설정을 불러오지 못했습니다."); } });
    return () => { active = false; };
  }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    if (!config?.configured) return setMessage("공통 로그인 설정이 아직 완료되지 않았습니다.");
    if (mode === "signup" && (!realName.trim() || !nickname.trim() || [...nickname.trim()].length > 7)) return setMessage("이름과 7글자 이하 닉네임을 입력해 주세요.");
    if (mode === "verify" && !/^\d{6}$/.test(verificationCode)) return setMessage("이메일의 6자리 확인 코드를 입력해 주세요.");
    setLoading(true); setMessage("");
    try {
      const response = mode === "signup"
        ? await fetch(window.location.hostname.endsWith(".lhsstart.synology.me") ? "https://literature.lhsstart.synology.me/api/signup" : "/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, role, realName: realName.trim(), nickname: nickname.trim(), teacherInviteCode }) })
        : mode === "verify"
          ? await fetch(`${config.url}/auth/v1/verify`, { method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim(), token: verificationCode, type: "email" }) })
          : await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload.error || payload.msg || payload.error_description || "인증하지 못했습니다."));
      if (mode === "signup" && !payload.access_token) { setMode("verify"); setPassword(""); setVerificationCode(""); setMessage("가입 확인 메일의 6자리 코드를 입력해 주세요."); return; }
      const session = saveSharedAuthSession(payload); await loadAccount(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : "인증에 실패했습니다."); }
    finally { setLoading(false); }
  }

  async function resend() {
    if (!config?.configured || !email.trim()) return setMessage("가입 이메일을 입력해 주세요.");
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`${config.url}/auth/v1/resend`, { method: "POST", headers: { apikey: config.key, "Content-Type": "application/json" }, body: JSON.stringify({ type: "signup", email: email.trim() }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload.error || payload.msg || "확인 코드를 다시 보내지 못했습니다."));
      setVerificationCode(""); setMessage("새 확인 코드를 보냈습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "확인 코드를 다시 보내지 못했습니다."); }
    finally { setLoading(false); }
  }

  if (account === undefined) return <main className="account-auth-shell"><div className="account-auth-loading">공통 계정을 확인하고 있습니다…</div></main>;
  if (account) return <>{children(account, () => { clearSharedAuthSession(); setAccount(null); })}</>;

  return <main className="account-auth-shell"><section className="account-auth-card">
    <div className="account-auth-brand"><span><Compass /></span><b>커리어폴리오</b></div>
    <p className="eyebrow">LHSSTART ACCOUNT</p><h1>{mode === "signup" ? "계정 만들기" : mode === "verify" ? "이메일 확인" : "통합 로그인"}</h1>
    <p>문학·문법·진로 사이트에서 함께 사용하는 계정입니다.</p>{message && <div className="account-auth-message" role="alert">{message}</div>}
    <form onSubmit={authenticate}>
      {mode === "signup" && <><label>가입 유형<select value={role} onChange={(event) => setRole(event.target.value as "teacher" | "student")}><option value="student">학생</option><option value="teacher">교사</option></select></label>{role === "teacher" && <label>교사 초대 코드<input required type="password" value={teacherInviteCode} onChange={(event) => setTeacherInviteCode(event.target.value)} /></label>}<label>이름<input required value={realName} onChange={(event) => setRealName(event.target.value)} /></label><label>닉네임 <small>최대 7글자</small><input required maxLength={7} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label></>}
      <label>이메일<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {mode === "verify" ? <label>6자리 확인 코드<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label> : <label>비밀번호<input required minLength={6} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
      <button className="account-auth-primary" disabled={loading}>{loading ? "처리 중…" : mode === "signup" ? `${role === "teacher" ? "교사" : "학생"} 회원가입` : mode === "verify" ? "코드 확인하고 로그인" : "로그인"}</button>
      {mode === "verify" && <button type="button" disabled={loading} onClick={() => void resend()}>확인 코드 다시 받기</button>}
      <button type="button" onClick={() => { setMessage(""); setMode(mode === "login" ? "signup" : "login"); }}>{mode === "login" ? "회원가입으로 이동" : "로그인으로 돌아가기"}</button>
    </form>
  </section></main>;
}
