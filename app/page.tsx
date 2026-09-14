"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive, ArrowRight, BarChart3, Bell, BookOpenCheck, BrainCircuit,
  Check, ChevronDown, ChevronRight, ClipboardCheck, Compass, FileText,
  GraduationCap, LayoutDashboard, Lightbulb, Menu, MoreHorizontal, Plus,
  Search, Sparkles, Target, UploadCloud, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SharedAuthGate, type SharedAccount } from "@/components/shared-auth-gate";

type Role = "student" | "teacher";
type Activity = {
  id: string | number;
  title: string;
  subject: string;
  date: string;
  score: number;
  status: string;
  color: string;
  keywords: string[];
};

const activities: Activity[] = [
  { id: 1, title: "미세플라스틱이 해양 생태계에 미치는 영향", subject: "환경과학 탐구 보고서", date: "9월 7일", score: 92, status: "분석 완료", color: "bg-[#dff4ee] text-[#16725e]", keywords: ["미세플라스틱", "생태독성", "먹이사슬", "환경공학"] },
  { id: 2, title: "학교 전력 사용량을 줄이는 데이터 모델", subject: "수학 주제 탐구", date: "8월 28일", score: 86, status: "분석 완료", color: "bg-[#e8edff] text-[#4559a7]", keywords: ["회귀분석", "에너지 효율", "데이터", "탄소중립"] },
  { id: 3, title: "도시 빗물 정원의 수질 정화 원리", subject: "동아리 활동 계획서", date: "8월 16일", score: 78, status: "보완 필요", color: "bg-[#fff0dc] text-[#a45b13]", keywords: ["저영향개발", "수질", "도시계획"] },
];

const navItems = [
  { label: "오늘의 활동", icon: LayoutDashboard, active: true },
  { label: "나의 결과물", icon: Archive },
  { label: "진로 탐색", icon: Compass },
  { label: "성장 리포트", icon: BarChart3 },
];

function FitRing({ score, small = false }: { score: number; small?: boolean }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  return <div className={`relative ${small ? "h-20 w-20" : "h-32 w-32"}`}>
    <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="52" cy="52" r={radius} fill="none" stroke="#e8edf5" strokeWidth="9" />
      <circle cx="52" cy="52" r={radius} fill="none" stroke="#4f67d8" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} ${circumference - dash}`} />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><span className={`${small ? "text-lg" : "text-3xl"} font-bold tracking-tight text-[#192341]`}>{score}<span className={`${small ? "text-xs" : "text-sm"} ml-0.5 text-[#68738d]`}>%</span></span></div>
  </div>;
}

function StudentDashboard({ onOpenUpload, items, name }: { onOpenUpload: () => void; items: Activity[]; name: string }) {
  const [filter, setFilter] = useState("전체");
  const visible = useMemo(() => items.filter((item) => filter === "전체" || item.subject.includes(filter)), [filter, items]);
  return <>
    <section className="welcome-row">
      <div><p className="eyebrow">2026학년도 · 2학기</p><h1>{name}님의 진로 활동</h1><p className="subcopy">나의 진로를 향한 탐구가 한 걸음씩 쌓이고 있어요.</p></div>
      <Button onClick={onOpenUpload} className="h-11 rounded-xl bg-[#314cc7] px-5 text-[0.94rem] shadow-[0_8px_20px_rgba(49,76,199,.24)] hover:bg-[#243dad]"><Plus className="size-4" /> 새 결과물 등록</Button>
    </section>

    <section className="student-grid" aria-label="진로 활동 요약">
      <article className="career-card">
        <div className="career-card__top">
          <div><span className="section-kicker"><Target /> 나의 진로 나침반</span><h2>환경공학 · 지속가능 기술</h2><p>최근 3개 활동의 주제와 탐구 과정을 분석했어요.</p></div>
          <FitRing score={87} />
        </div>
        <div className="signal-grid">
          <div><span>강한 연결</span><b>환경 문제 정의</b><small>3개 활동에서 반복 확인</small></div>
          <div><span>성장 중</span><b>데이터 기반 해석</b><small>근거 자료의 폭을 넓혀보세요</small></div>
          <div><span>다음 초점</span><b>공학적 해결 설계</b><small>실험·프로토타입으로 확장</small></div>
        </div>
      </article>
      <article className="next-card">
        <div className="next-card__icon"><Sparkles /></div><span className="section-kicker">활동 분석이 찾은 다음 탐구</span>
        <h2>미세플라스틱을<br />직접 측정해 볼까요?</h2>
        <p>보고서의 ‘생태 영향’ 관점을 실제 하천 시료의 농도 비교로 확장할 수 있어요.</p>
        <div className="next-meta"><span>예상 2주</span><span>실험·데이터 분석</span></div>
        <button className="text-link">탐구 가이드 보기 <ArrowRight /></button>
      </article>
    </section>

    <section className="growth-strip">
      <div className="growth-title"><span className="growth-icon"><BrainCircuit /></span><div><b>이번 학기 성장 지표</b><small>활동의 깊이와 연결성을 기준으로 분석했어요</small></div></div>
      <div className="growth-metric"><span>탐구 깊이</span><div><i style={{ width: "84%" }} /></div><b>84</b></div>
      <div className="growth-metric"><span>진로 연결</span><div><i style={{ width: "87%" }} /></div><b>87</b></div>
      <div className="growth-metric"><span>활동 연속성</span><div><i style={{ width: "72%" }} /></div><b>72</b></div>
    </section>

    <section className="activity-section">
      <div className="section-heading"><div><h2>최근 결과물</h2><p>분석된 핵심 내용과 진로 연결 근거를 확인하세요.</p></div><div className="filter-group" aria-label="결과물 필터">
        {["전체", "환경과학", "수학", "동아리"].map((item) => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "active" : ""}>{item}</button>)}
      </div></div>
      <div className="activity-list">{visible.map((activity) => <article className="activity-row" key={activity.id}>
        <div className="file-icon"><FileText /></div>
        <div className="activity-main"><div className="activity-meta"><span className={activity.color}>{activity.subject}</span><time>{activity.date}</time></div><h3>{activity.title}</h3><div className="keyword-row">{activity.keywords.map((keyword) => <span key={keyword}>#{keyword}</span>)}</div></div>
        <div className="activity-score"><small>진로 적합도</small><b>{activity.score}%</b><span><Check /> {activity.status}</span></div>
        <button className="row-action" aria-label={`${activity.title} 상세 보기`}><ChevronRight /></button>
      </article>)}</div>
    </section>
  </>;
}

function TeacherDashboard() {
  const students = [
    ["김민서", "환경공학", "9개", "탐구의 연속성과 자료 해석 역량이 돋보임", "관찰 준비"],
    ["박서준", "인공지능", "7개", "문제 해결 과정에서 알고리즘을 반복 개선함", "검토 필요"],
    ["이하윤", "생명과학", "8개", "실험 변인을 구체화하고 결과의 한계를 성찰함", "관찰 준비"],
    ["최유진", "도시계획", "5개", "지역 문제를 공간 데이터와 연결하는 관점이 성장함", "활동 부족"],
  ];
  return <>
    <section className="welcome-row"><div><p className="eyebrow">2학년 3반 · 담임 대시보드</p><h1>학생 성장 관찰</h1><p className="subcopy">결과물에 나타난 과정과 변화를 생활기록부 관찰 단서로 확인하세요.</p></div><Button className="h-11 rounded-xl bg-[#314cc7] px-5"><ClipboardCheck /> 관찰 메모 모아보기</Button></section>
    <section className="teacher-stats"><article><span><Users /></span><div><small>활동 학생</small><b>28명</b></div><em>+4 이번 주</em></article><article><span><FileText /></span><div><small>누적 결과물</small><b>146개</b></div><em>검토 12개</em></article><article><span><BookOpenCheck /></span><div><small>관찰 단서</small><b>63개</b></div><em>확인 가능</em></article></section>
    <section className="teacher-panel">
      <div className="section-heading"><div><h2>학생별 활동 흐름</h2><p>자동 요약은 참고 자료이며 교사가 원문을 확인한 뒤 활용합니다.</p></div><div className="search-box"><Search /><input aria-label="학생 검색" placeholder="학생 이름 검색" /></div></div>
      <div className="student-table" role="table" aria-label="학생별 활동 흐름"><div className="student-tr table-head" role="row"><span>학생</span><span>희망 진로</span><span>결과물</span><span>성장 관찰 단서</span><span>상태</span><span /></div>
        {students.map((student, i) => <div className="student-tr" role="row" key={student[0]}><span className="student-name"><i>{student[0].slice(1)}</i><b>{student[0]}</b></span><span>{student[1]}</span><span>{student[2]}</span><span className="clue">{student[3]}</span><span><em className={i === 3 ? "warning" : i === 1 ? "review" : "ready"}>{student[4]}</em></span><span><button aria-label={`${student[0]} 상세 보기`}><ChevronRight /></button></span></div>)}
      </div>
    </section>
  </>;
}

function UploadDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: (item: Activity) => void }) {
  const [step, setStep] = useState<"form" | "analyzing" | "done">("form");
  const [title, setTitle] = useState("");
  const [career, setCareer] = useState("환경공학");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ score: number; keywords: string[]; nextStep: string } | null>(null);
  const [error, setError] = useState("");
  const handleAnalyze = async () => {
    if (!title.trim() || !career.trim() || !summary.trim()) { setError("제목, 진로 분야, 핵심 내용을 모두 입력해 주세요."); return; }
    setError(""); setStep("analyzing");
    const form = new FormData();
    form.set("title", title); form.set("career", career); form.set("summary", summary); form.set("category", "자율 탐구");
    if (file) form.set("file", file);
    try {
      const response = await fetch("/api/activities", { method: "POST", body: form });
      const payload = await response.json() as { activity?: { id: string; title: string; category: string; fitScore: number; status: string; keywords: string[]; nextStep: string }; error?: string };
      if (!response.ok || !payload.activity) throw new Error(payload.error ?? "저장하지 못했습니다.");
      const item: Activity = { id: payload.activity.id, title: payload.activity.title, subject: payload.activity.category, date: "방금 전", score: payload.activity.fitScore, status: payload.activity.status, color: "bg-[#e8edff] text-[#4559a7]", keywords: payload.activity.keywords };
      onSaved(item); setResult({ score: item.score, keywords: item.keywords, nextStep: payload.activity.nextStep }); setStep("done");
    } catch (reason) {
      setStep("form"); setError(reason instanceof Error ? reason.message : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };
  const close = (value: boolean) => { onOpenChange(value); if (!value) window.setTimeout(() => { setStep("form"); setTitle(""); setSummary(""); setFile(null); setResult(null); setError(""); }, 200); };
  return <Dialog open={open} onOpenChange={close}><DialogContent className="upload-dialog max-h-[92vh] overflow-y-auto border-0 p-0 sm:max-w-[620px]">
    {step === "form" && <><DialogHeader className="border-b border-[#e8ebf2] px-7 py-6"><DialogTitle className="text-[1.25rem] text-[#18213b]">새 결과물 등록</DialogTitle><DialogDescription>계획서나 보고서를 첨부하고 핵심 내용을 함께 적어주세요.</DialogDescription></DialogHeader>
      <div className="grid gap-5 px-7 py-6"><div className="grid gap-2"><Label htmlFor="activity-title">활동 제목</Label><Input id="activity-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 미세플라스틱의 생태 영향 탐구" /></div><div className="grid gap-2"><Label htmlFor="career-field">연결하고 싶은 진로 분야</Label><Input id="career-field" value={career} onChange={(event) => setCareer(event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="summary">핵심 내용</Label><Textarea id="summary" value={summary} onChange={(event) => setSummary(event.target.value)} rows={5} placeholder="탐구 동기, 조사·실험 과정, 새롭게 알게 된 점을 적어주세요." /></div><label className="dropzone" htmlFor="result-file"><UploadCloud /><b>{file ? file.name : "파일을 선택하거나 여기로 끌어오세요"}</b><span>PDF, DOCX, HWP · 최대 20MB</span><input id="result-file" type="file" accept=".pdf,.doc,.docx,.hwp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="privacy-note"><Check /><span>업로드한 자료는 활동 분석과 포트폴리오 관리에만 사용됩니다.</span></div></div>
      <DialogFooter className="border-t border-[#e8ebf2] px-7 py-5"><Button variant="ghost" onClick={() => close(false)}>취소</Button><Button onClick={handleAnalyze} className="bg-[#314cc7] hover:bg-[#243dad]"><Sparkles /> 저장하고 분석하기</Button></DialogFooter></>}
    {step === "analyzing" && <div className="analysis-state"><div className="analysis-orbit"><BrainCircuit /></div><DialogTitle>활동의 의미를 찾고 있어요</DialogTitle><DialogDescription>핵심 키워드와 진로 연결 근거를 분석합니다.</DialogDescription><Progress value={68} className="mt-4 h-2 bg-[#e8ecf7] [&_[data-slot=progress-indicator]]:bg-[#4f67d8]" /><span>보고서 핵심 문장 분석 중…</span></div>}
    {step === "done" && result && <div className="done-state"><div className="done-check"><Check /></div><DialogTitle>분석이 완료되었어요</DialogTitle><DialogDescription>진로 연결도 {result.score}% · 핵심 키워드 {result.keywords.length}개를 찾았습니다.</DialogDescription><div className="done-keywords">{result.keywords.map((keyword) => <span key={keyword}>#{keyword}</span>)}</div><div className="done-insight"><Lightbulb /><p><b>다음 탐구 제안</b>{result.nextStep}</p></div><Button onClick={() => close(false)} className="w-full bg-[#314cc7]">대시보드에서 확인하기</Button></div>}
  </DialogContent></Dialog>;
}

function CareerDashboard({ account, logout }: { account: SharedAccount; logout: () => void }) {
  const role: Role = account.role;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [items, setItems] = useState<Activity[]>(activities);

  useEffect(() => {
    fetch("/api/activities").then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { activities?: Array<{ id: string; title: string; category: string; fitScore: number; status: string; keywords: string[]; createdAt: string }> };
      if (!payload.activities?.length) return;
      const saved = payload.activities.map((item) => ({ id: item.id, title: item.title, subject: item.category, date: new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(item.createdAt)), score: item.fitScore, status: item.status, color: "bg-[#e8edff] text-[#4559a7]", keywords: item.keywords }));
      setItems([...saved, ...activities]);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: () => { status: string } }, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({ name: "start_submission_creation", title: "새 결과물 등록 시작", description: "학생의 새 계획서나 보고서를 등록할 수 있도록 입력 창을 엽니다.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: () => { if (account.role === "student") setUploadOpen(true); return { status: account.role === "student" ? "submission_form_opened" : "student_account_required" }; } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [account.role]);
  return <main className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
      <div className="brand"><span><Compass /></span><b>커리어폴리오</b><button onClick={() => setMobileOpen(false)} aria-label="메뉴 닫기"><X /></button></div>
      <nav aria-label="주요 메뉴">{navItems.map((item) => <button key={item.label} className={item.active ? "active" : ""}><item.icon />{item.label}</button>)}</nav>
      <div className="sidebar-guide"><span><Lightbulb /></span><b>활동 설계 가이드</b><p>막막할 때 질문을 따라 나만의 탐구를 시작해 보세요.</p><button>가이드 열기 <ArrowRight /></button></div>
      <div className="profile"><div className="avatar">{account.displayName.slice(0, 2)}</div><div><b>{account.displayName}</b><span>{role === "teacher" ? "교사 계정" : "학생 계정"}</span></div><button aria-label="로그아웃" onClick={logout}><MoreHorizontal /></button></div>
    </aside>
    <div className="workspace"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="메뉴 열기"><Menu /></button><div className="mobile-brand"><Compass /><b>커리어폴리오</b></div><Tabs value={role}><TabsList className="role-tabs"><TabsTrigger value="student"><GraduationCap /> 학생</TabsTrigger><TabsTrigger value="teacher"><Users /> 교사</TabsTrigger></TabsList></Tabs><div className="top-actions"><button aria-label="알림"><Bell /><i /></button><span /><div><b>{account.displayName}</b><small>{role === "student" ? "학생 계정" : "교사 계정"}</small></div><button className="account-logout" onClick={logout}>로그아웃</button><ChevronDown /></div></header><div className="content-wrap">{role === "student" ? <StudentDashboard name={account.displayName} onOpenUpload={() => setUploadOpen(true)} items={items} /> : <TeacherDashboard />}</div></div>
    <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onSaved={(item) => setItems((current) => [item, ...current])} />
  </main>;
}

export default function Home() {
  return <SharedAuthGate>{(account, logout) => <CareerDashboard account={account} logout={logout} />}</SharedAuthGate>;
}
