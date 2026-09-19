"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, CalendarDays, CheckCircle2, ClipboardList, Compass, FileDown, LogIn, Megaphone, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveSharedAuthSession } from "@/lib/shared-auth";

type PublicForm = { id: string; title: string; description: string; category: string; questions: Array<{ id: string; label: string; type: string; required: boolean }> };
type PublicAnnouncement = { id: string; title: string; content: string; createdAt: string };

const fallbackForms: PublicForm[] = [{
  id: "activity-report-basic",
  title: "진로 연계 활동 보고서",
  description: "활동 동기부터 탐구 과정, 배운 점과 다음 계획까지 차근차근 기록합니다.",
  category: "공통 과제",
  questions: [
    { id: "q1", label: "이 활동을 시작한 이유는 무엇인가요?", type: "long_text", required: true },
    { id: "q2", label: "활동 과정에서 직접 조사하거나 시도한 내용을 적어주세요.", type: "long_text", required: true },
    { id: "q3", label: "새롭게 알게 된 점과 다음에 더 탐구하고 싶은 것은 무엇인가요?", type: "long_text", required: true },
  ],
}];

function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [career, setCareer] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(""); setMessage(""); setBusy(true);
    try {
      if (mode === "signup" && (!name.trim() || !career.trim())) throw new Error("이름과 희망 진로를 입력해 주세요.");
      const configResponse = await fetch("/api/auth/config", { cache: "no-store" });
      const config = await configResponse.json() as { configured: boolean; url: string; key: string };
      if (!config.configured) throw new Error("통합 로그인 설정을 확인하지 못했습니다.");
      const response = mode === "login"
        ? await fetch(`${config.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: config.key, "content-type": "application/json" }, body: JSON.stringify({ email, password }) })
        : await fetch(window.location.hostname.endsWith(".lhsstart.synology.me") ? "https://literature.lhsstart.synology.me/api/signup" : "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, role: "student", realName: name.trim(), nickname: name.trim().slice(0, 7), career: career.trim() }) });
      const payload = await response.json() as { access_token?: string; error?: string; msg?: string; error_description?: string };
      if (!response.ok) throw new Error(payload.error ?? payload.msg ?? payload.error_description ?? "요청을 처리하지 못했습니다.");
      if (!payload.access_token) {
        localStorage.setItem("careerfolio_pending_profile", JSON.stringify({ displayName: name.trim(), career: career.trim() }));
        setMessage("가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.");
      } else {
        saveSharedAuthSession(payload);
        if (mode === "signup") {
          const pending = { displayName: name.trim(), career: career.trim() };
          localStorage.setItem("careerfolio_pending_profile", JSON.stringify(pending));
        }
        const pendingProfile = localStorage.getItem("careerfolio_pending_profile");
        if (pendingProfile) {
          const profileResponse = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: pendingProfile });
          if (profileResponse.ok) localStorage.removeItem("careerfolio_pending_profile");
        }
        window.location.href = "/dashboard";
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "잠시 후 다시 시도해 주세요.");
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="auth-dialog border-0 p-0 sm:max-w-[500px]">
      <DialogHeader className="auth-head"><div className="auth-mark"><Compass /></div><DialogTitle>커리어폴리오 시작하기</DialogTitle><DialogDescription>활동을 기록하고 나만의 진로 탐구 흐름을 만들어 보세요.</DialogDescription></DialogHeader>
      <Tabs value={mode} onValueChange={(value) => { setMode(value); setError(""); setMessage(""); }} className="px-7 pb-7">
        <TabsList className="auth-tabs"><TabsTrigger value="login">로그인</TabsTrigger><TabsTrigger value="signup">학생 가입</TabsTrigger></TabsList>
        <TabsContent value="login" className="auth-form">
          <div><Label htmlFor="login-email">이메일</Label><Input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" /></div>
          <div><Label htmlFor="login-password">비밀번호</Label><Input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        </TabsContent>
        <TabsContent value="signup" className="auth-form">
          <div className="auth-two"><div><Label htmlFor="student-name">이름</Label><Input id="student-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="김민서" /></div><div><Label htmlFor="student-career">희망 진로</Label><Input id="student-career" value={career} onChange={(event) => setCareer(event.target.value)} placeholder="환경공학" /></div></div>
          <div><Label htmlFor="signup-email">이메일</Label><Input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" /></div>
          <div><Label htmlFor="signup-password">비밀번호</Label><Input id="signup-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" /></div>
        </TabsContent>
        {error && <p className="auth-alert error" role="alert">{error}</p>}
        {message && <p className="auth-alert success"><CheckCircle2 />{message}</p>}
        <Button onClick={submit} disabled={busy} className="auth-submit">{busy ? "처리 중…" : mode === "login" ? "로그인" : "가입하기"}<ArrowRight /></Button>
        <p className="auth-privacy"><ShieldCheck />가입 정보와 활동 기록은 진로 활동 관리 목적으로만 사용됩니다.</p>
      </Tabs>
    </DialogContent>
  </Dialog>;
}

export default function PublicHome() {
  const [authOpen, setAuthOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [forms, setForms] = useState<PublicForm[]>(fallbackForms);
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);

  useEffect(() => {
    fetch("/api/auth/session").then((response) => setSignedIn(response.ok)).catch(() => undefined);
    fetch("/api/forms?public=1").then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { forms?: PublicForm[] };
      if (payload.forms?.length) setForms(payload.forms);
    }).catch(() => undefined);
    fetch("/api/announcements").then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { announcements?: PublicAnnouncement[] };
      setAnnouncements(payload.announcements ?? []);
    }).catch(() => undefined);
  }, []);

  return <main className="public-shell">
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <header className="public-header"><a className="public-brand" href="/"><span><Compass /></span><b>커리어폴리오</b></a><nav><a href="#notices">공지사항</a><a href="#forms">활동지</a></nav><div>{signedIn ? <Button asChild className="rounded-xl bg-[#314cc7]"><a href="/dashboard">내 활동 보기 <ArrowRight /></a></Button> : <><Button variant="ghost" onClick={() => setAuthOpen(true)}><LogIn /> 로그인</Button><Button onClick={() => setAuthOpen(true)} className="rounded-xl bg-[#314cc7]"><UserPlus /> 학생 가입</Button></>}</div></header>

    <section className="public-hero">
      <div className="hero-copy"><p className="public-eyebrow"><Sparkles /> 활동이 진로의 방향이 되도록</p><h1>한 번의 활동을<br />다음 탐구로 이어가세요.</h1><p>활동 보고서를 기록하면 관심 분야와의 연결점을 찾고, 앞으로 이어갈 수 있는 질문과 활동을 제안합니다.</p><div className="hero-actions"><Button onClick={() => signedIn ? window.location.assign("/dashboard") : setAuthOpen(true)} className="h-12 rounded-xl bg-[#314cc7] px-6">{signedIn ? "내 활동 보기" : "무료로 시작하기"}<ArrowRight /></Button><a href="#forms">활동지 먼저 보기</a></div></div>
      <div className="hero-board"><div className="board-head"><span>나의 탐구 흐름</span><b>환경공학</b></div><div className="journey-line"><i /><div><small>첫 탐구</small><b>미세플라스틱의 생태 영향</b></div><i /><div><small>확장 활동</small><b>지역 하천 시료 비교</b></div><i className="future" /><div><small>다음 제안</small><b>정화 소재 효율 실험</b></div></div><div className="board-insight"><Compass /><p><b>진로 연결도 87%</b>환경 문제를 데이터로 해석하는 역량이 꾸준히 성장하고 있어요.</p></div></div>
    </section>

    <section id="notices" className="public-section"><div className="public-section-head"><div><span><Megaphone /> 알림</span><h2>공지사항</h2></div><p>로그인하지 않아도 중요한 일정과 안내를 확인할 수 있습니다.</p></div><div className="notice-grid">{announcements.length ? announcements.map((notice, index) => <article className={`notice-card ${index === 0 ? "important" : ""}`} key={notice.id}><span>{index === 0 ? "최신" : "안내"}</span><time>{new Intl.DateTimeFormat("ko-KR").format(new Date(notice.createdAt))}</time><h3>{notice.title}</h3><p>{notice.content}</p>{index === 0 && <a href="#forms">활동지 확인 <ArrowRight /></a>}</article>) : <article className="notice-card"><span>안내</span><h3>등록된 공지사항이 없습니다</h3><p>새로운 안내가 등록되면 이곳에서 확인할 수 있습니다.</p></article>}</div></section>

    <section id="forms" className="public-section form-library"><div className="public-section-head"><div><span><ClipboardList /> 자료실</span><h2>활동지 양식</h2></div><p>문항은 교사가 활동 목적에 맞게 수정하고 배포합니다.</p></div><div className="public-form-grid">
      {forms.map((form) => <article className="public-form-card" key={form.id}><div className="form-card-icon"><BookOpenCheck /></div><span>{form.category}</span><h3>{form.title}</h3><p>{form.description}</p><ol>{form.questions.map((question) => <li key={question.id}>{question.label}{question.required && <small> 필수</small>}</li>)}</ol><div><span className="public-read-label"><FileDown /> 로그인 없이 전체 문항 조회 중</span><Button onClick={() => signedIn ? window.location.assign("/dashboard") : setAuthOpen(true)}>{signedIn ? "작성하기" : "로그인 후 작성"}<ArrowRight /></Button></div></article>)}
      <aside className="guide-card"><CalendarDays /><h3>활동 전에도 활용하세요</h3><p>보고서 문항을 먼저 읽어보면 활동 중 무엇을 관찰하고 기록해야 하는지 알 수 있습니다.</p><ul><li>활동 동기와 질문</li><li>직접 시도한 과정</li><li>새롭게 발견한 관점</li><li>다음 심화 활동</li></ul></aside>
    </div></section>
    <footer className="public-footer"><div className="public-brand"><span><Compass /></span><b>커리어폴리오</b></div><p>학생의 기록은 평가를 대신하지 않습니다. 성장 과정과 다음 탐구를 돕는 참고 자료입니다.</p></footer>
    <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
  </main>;
}
