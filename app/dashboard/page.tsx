"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { clearSharedAuthSession } from "@/lib/shared-auth";

type Profile = {
  id: string;
  email: string;
  displayName: string;
  role: "student" | "teacher";
  career: string;
  interests: string[];
};
type Question = {
  id: string;
  label: string;
  type: "short_text" | "long_text";
  required: boolean;
  placeholder?: string;
};
type ActivityForm = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  questions: Question[];
};
type Activity = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  fitScore: number;
  status: string;
  keywords: string[];
  nextStep: string;
  teacherClue?: string;
  studentName?: string;
  career?: string;
};
type StudentSection = "today" | "results" | "career" | "growth";

function FitRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative h-32 w-32">
      <svg
        viewBox="0 0 104 104"
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#e8edf5"
          strokeWidth="9"
        />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#4f67d8"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold text-[#192341]">
          {score}
          <small className="text-sm text-[#68738d]">%</small>
        </span>
      </div>
    </div>
  );
}

function StudentDashboard({
  profile,
  items,
  forms,
  onWrite,
  onEditProfile,
}: {
  profile: Profile;
  items: Activity[];
  forms: ActivityForm[];
  onWrite: (form: ActivityForm) => void;
  onEditProfile: () => void;
}) {
  const average = items.length
    ? Math.round(
        items.reduce((sum, item) => sum + item.fitScore, 0) / items.length,
      )
    : 0;
  const latest = items[0];
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">나의 진로 포트폴리오</p>
          <h1>{profile.displayName}님의 진로 활동</h1>
          <p className="subcopy">
            {profile.career} 분야를 향한 탐구 흐름을 차근차근 쌓아보세요.
          </p>
        </div>
        <div className="welcome-actions">
          <Button variant="outline" onClick={onEditProfile}>
            <Settings2 /> 진로 설정
          </Button>
          <Button
            onClick={() => forms[0] && onWrite(forms[0])}
            disabled={!forms.length}
            className="h-11 rounded-xl bg-[#314cc7] px-5"
          >
            <Plus /> 새 보고서 작성
          </Button>
        </div>
      </section>
      <section className="student-grid">
        <article className="career-card">
          <div className="career-card__top">
            <div>
              <span className="section-kicker">
                <Target /> 나의 진로 나침반
              </span>
              <h2>{profile.career}</h2>
              <p>
                {items.length
                  ? `${items.length}개 활동에서 나타난 주제와 탐구 과정을 분석했어요.`
                  : "첫 활동을 기록하면 진로 연결 분석이 시작됩니다."}
              </p>
            </div>
            <FitRing score={average} />
          </div>
          <div className="signal-grid">
            <div>
              <span>누적 기록</span>
              <b>{items.length}개</b>
              <small>계획서·보고서</small>
            </div>
            <div>
              <span>핵심 관심</span>
              <b>{latest?.keywords?.[0] ?? "탐색 중"}</b>
              <small>활동에서 보이는 관점</small>
            </div>
            <div>
              <span>다음 초점</span>
              <b>{latest ? "심화 탐구" : "첫 기록"}</b>
              <small>
                {latest ? "제안된 활동으로 확장" : "관심 활동을 등록해 보세요"}
              </small>
            </div>
          </div>
        </article>
        <article className="next-card">
          <div className="next-card__icon">
            <Sparkles />
          </div>
          <span className="section-kicker">분석이 찾은 다음 탐구</span>
          <h2>
            {latest
              ? "이 활동을 한 단계 더 깊게"
              : "관심에서 질문을 시작해 볼까요?"}
          </h2>
          <p>
            {latest?.nextStep ??
              "수업, 동아리, 독서에서 궁금했던 점 하나를 골라 활동지에 기록해 보세요."}
          </p>
          {forms[0] && (
            <button className="text-link" onClick={() => onWrite(forms[0])}>
              활동지로 이어가기 <ArrowRight />
            </button>
          )}
        </article>
      </section>
      <section className="activity-section">
        <div className="section-heading">
          <div>
            <h2>나의 결과물</h2>
            <p>분석된 핵심 키워드와 진로 연결 정도를 확인하세요.</p>
          </div>
        </div>
        {items.length ? (
          <div className="activity-list">
            {items.map((activity) => (
              <article className="activity-row" key={activity.id}>
                <div className="file-icon">
                  <FileText />
                </div>
                <div className="activity-main">
                  <div className="activity-meta">
                    <span className="bg-[#e8edff] text-[#4559a7]">
                      {activity.category}
                    </span>
                    <time>
                      {new Intl.DateTimeFormat("ko-KR", {
                        month: "long",
                        day: "numeric",
                      }).format(new Date(activity.createdAt))}
                    </time>
                  </div>
                  <h3>{activity.title}</h3>
                  <div className="keyword-row">
                    {activity.keywords.map((keyword) => (
                      <span key={keyword}>#{keyword}</span>
                    ))}
                  </div>
                </div>
                <div className="activity-score">
                  <small>진로 적합도</small>
                  <b>{activity.fitScore}%</b>
                  <span>
                    <Check /> {activity.status}
                  </span>
                </div>
                <ChevronRight className="text-[#98a1b5]" />
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FileText />
            <h3>아직 등록한 활동이 없어요</h3>
            <p>공개된 활동지를 따라 첫 기록을 남겨보세요.</p>
            {forms[0] && (
              <Button onClick={() => onWrite(forms[0])}>첫 보고서 작성</Button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function ResultsView({
  items,
  onWrite,
}: {
  items: Activity[];
  onWrite: () => void;
}) {
  const completed = items.filter((item) => item.status === "분석 완료").length;
  const average = items.length
    ? Math.round(
        items.reduce((sum, item) => sum + item.fitScore, 0) / items.length,
      )
    : 0;
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">누적 포트폴리오</p>
          <h1>나의 결과물</h1>
          <p className="subcopy">
            계획서와 보고서에 나타난 핵심 내용과 진로 연결 근거를 모아봅니다.
          </p>
        </div>
        <Button onClick={onWrite} className="h-11 rounded-xl bg-[#314cc7] px-5">
          <Plus /> 새 보고서 작성
        </Button>
      </section>
      <section className="section-summary-grid">
        <article>
          <FileText />
          <span>누적 결과물</span>
          <b>{items.length}개</b>
        </article>
        <article>
          <Check />
          <span>분석 완료</span>
          <b>{completed}개</b>
        </article>
        <article>
          <Target />
          <span>평균 진로 적합도</span>
          <b>{average}%</b>
        </article>
      </section>
      <section className="activity-section tab-panel">
        <div className="section-heading">
          <div>
            <h2>전체 결과물</h2>
            <p>최근에 작성한 순서로 표시됩니다.</p>
          </div>
        </div>
        {items.length ? (
          <div className="activity-list">
            {items.map((activity) => (
              <article className="activity-row" key={activity.id}>
                <div className="file-icon">
                  <FileText />
                </div>
                <div className="activity-main">
                  <div className="activity-meta">
                    <span className="bg-[#e8edff] text-[#4559a7]">
                      {activity.category}
                    </span>
                    <time>
                      {new Intl.DateTimeFormat("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date(activity.createdAt))}
                    </time>
                  </div>
                  <h3>{activity.title}</h3>
                  <div className="keyword-row">
                    {activity.keywords.map((keyword) => (
                      <span key={keyword}>#{keyword}</span>
                    ))}
                  </div>
                </div>
                <div className="activity-score">
                  <small>진로 적합도</small>
                  <b>{activity.fitScore}%</b>
                  <span>
                    <Check /> {activity.status}
                  </span>
                </div>
                <ChevronRight className="text-[#98a1b5]" />
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <FileText />
            <h3>아직 결과물이 없어요</h3>
            <p>첫 활동 보고서를 작성하면 이곳에 차곡차곡 쌓입니다.</p>
            <Button onClick={onWrite}>첫 보고서 작성</Button>
          </div>
        )}
      </section>
    </>
  );
}

function CareerView({
  profile,
  items,
  onEditProfile,
  onWrite,
}: {
  profile: Profile;
  items: Activity[];
  onEditProfile: () => void;
  onWrite: () => void;
}) {
  const keywords = [...new Set(items.flatMap((item) => item.keywords))].slice(
    0,
    8,
  );
  const latest = items[0];
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">관심을 탐구 주제로</p>
          <h1>진로 탐색</h1>
          <p className="subcopy">
            나의 활동에서 발견한 관심과 다음 탐구 방향을 확인하세요.
          </p>
        </div>
        <Button variant="outline" onClick={onEditProfile}>
          <Settings2 /> 진로·관심 수정
        </Button>
      </section>
      <section className="career-explore-grid">
        <article className="career-focus-card">
          <span className="section-kicker">
            <Compass /> 현재 희망 진로
          </span>
          <h2>{profile.career}</h2>
          <p>활동 기록이 쌓일수록 추천이 나에게 맞게 구체화됩니다.</p>
          <div className="interest-cloud">
            {(profile.interests?.length ? profile.interests : keywords).map(
              (keyword) => (
                <span key={keyword}>#{keyword}</span>
              ),
            )}
            {!profile.interests?.length && !keywords.length && (
              <span>#관심 키워드를 설정해 보세요</span>
            )}
          </div>
        </article>
        <article className="career-question-card">
          <Sparkles />
          <span>다음 탐구 질문</span>
          <h2>
            {latest
              ? `${latest.title}에서 무엇을 직접 비교하거나 검증할 수 있을까요?`
              : `${profile.career} 분야에서 요즘 가장 궁금한 문제는 무엇인가요?`}
          </h2>
          <p>
            {latest?.nextStep ??
              "관심 분야의 실제 사례 하나를 찾아 문제의 원인과 해결 방법을 조사해 보세요."}
          </p>
          <Button onClick={onWrite}>
            이 주제로 활동 시작 <ArrowRight />
          </Button>
        </article>
      </section>
      <section className="pathway-section">
        <div className="section-heading">
          <div>
            <h2>추천 활동 경로</h2>
            <p>현재 기록을 다음 단계로 확장하는 방법입니다.</p>
          </div>
        </div>
        <div className="pathway-grid">
          <article>
            <span>1</span>
            <div>
              <b>관찰하고 질문하기</b>
              <p>
                수업·독서·생활에서 진로와 연결되는 문제를 한 문장으로
                정리합니다.
              </p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <b>자료로 확인하기</b>
              <p>
                통계, 인터뷰, 실험처럼 직접 확인할 수 있는 근거를 수집합니다.
              </p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <b>새 관점으로 확장하기</b>
              <p>결과의 한계를 돌아보고 다른 교과나 사회 문제와 연결합니다.</p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function GrowthView({ items }: { items: Activity[] }) {
  const average = items.length
    ? Math.round(
        items.reduce((sum, item) => sum + item.fitScore, 0) / items.length,
      )
    : 0;
  const keywordCount = new Set(items.flatMap((item) => item.keywords)).size;
  const depth = Math.min(100, 45 + items.length * 9);
  const continuity = Math.min(100, 35 + Math.max(0, items.length - 1) * 14);
  const metrics = [
    { label: "탐구 깊이", score: depth, note: "활동 수와 분석 완료 기록" },
    { label: "진로 연결", score: average, note: "보고서의 진로 핵심어 연결" },
    {
      label: "활동 연속성",
      score: continuity,
      note: "이전 활동에서 다음 활동으로의 확장",
    },
  ];
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">기록으로 보는 변화</p>
          <h1>성장 리포트</h1>
          <p className="subcopy">
            누적 활동에서 탐구의 깊이와 진로 연결 변화를 살펴봅니다.
          </p>
        </div>
      </section>
      <section className="growth-overview">
        <div>
          <span className="section-kicker">
            <BarChart3 /> 현재 성장 지표
          </span>
          <h2>
            {items.length
              ? "탐구 경험이 쌓이고 있어요"
              : "첫 기록부터 성장이 시작됩니다"}
          </h2>
          <p>
            {items.length
              ? `${items.length}개의 활동에서 ${keywordCount}개의 서로 다른 핵심 키워드를 발견했습니다.`
              : "활동을 기록하면 탐구 깊이, 진로 연결, 활동 연속성을 분석합니다."}
          </p>
        </div>
        <FitRing score={average} />
      </section>
      <section className="growth-metrics-panel">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <div>
              <b>{metric.label}</b>
              <span>{metric.note}</span>
            </div>
            <strong>{metric.score}</strong>
            <div className="report-bar">
              <i style={{ width: `${metric.score}%` }} />
            </div>
          </article>
        ))}
      </section>
      <section className="growth-advice">
        <Lightbulb />
        <div>
          <span>이번 달 성장 제안</span>
          <h2>
            {items[0]?.nextStep ??
              "관심 분야의 활동 하나를 선택해 과정과 배운 점을 기록해 보세요."}
          </h2>
          <p>
            점수는 평가가 아니라 다음 탐구 방향을 찾기 위한 참고 지표입니다.
          </p>
        </div>
      </section>
    </>
  );
}

function FormManager({
  forms,
  onSaved,
}: {
  forms: ActivityForm[];
  onSaved: (form: ActivityForm) => void;
}) {
  const blank = (): ActivityForm => ({
    id: "",
    title: "새 활동 보고서",
    description: "",
    category: "공통 활동지",
    status: "draft",
    questions: [
      { id: crypto.randomUUID(), label: "", type: "long_text", required: true },
    ],
  });
  const [draft, setDraft] = useState<ActivityForm>(() =>
    forms[0] ? structuredClone(forms[0]) : blank(),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const updateQuestion = (id: string, patch: Partial<Question>) =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((q) =>
        q.id === id ? { ...q, ...patch } : q,
      ),
    }));
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as {
        form?: ActivityForm;
        error?: string;
      };
      if (!response.ok || !payload.form)
        throw new Error(payload.error ?? "저장하지 못했습니다.");
      setDraft(payload.form);
      onSaved(payload.form);
      setMessage(
        payload.form.status === "published"
          ? "학생에게 공개했습니다."
          : "임시 저장했습니다.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="form-manager">
      <div className="form-list-panel">
        <div className="manager-title">
          <div>
            <span className="section-kicker">
              <ClipboardCheck /> 활동지 관리
            </span>
            <h2>보고서 양식</h2>
          </div>
          <Button size="sm" onClick={() => setDraft(blank())}>
            <Plus /> 새 양식
          </Button>
        </div>
        {forms.map((form) => (
          <button
            key={form.id}
            className={draft.id === form.id ? "active" : ""}
            onClick={() => setDraft(structuredClone(form))}
          >
            <b>{form.title}</b>
            <span>
              {form.status === "published" ? "공개 중" : "임시 저장"} ·{" "}
              {form.questions.length}문항
            </span>
          </button>
        ))}
      </div>
      <div className="form-editor">
        <div className="editor-head">
          <div>
            <span>양식 편집</span>
            <h2>{draft.title || "제목 없는 양식"}</h2>
          </div>
          <label className="publish-switch">
            <Switch
              checked={draft.status === "published"}
              onCheckedChange={(checked) =>
                setDraft({ ...draft, status: checked ? "published" : "draft" })
              }
            />
            <span>학생에게 공개</span>
          </label>
        </div>
        <div className="editor-meta">
          <div>
            <Label htmlFor="form-title">양식 제목</Label>
            <Input
              id="form-title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="form-category">분류</Label>
            <Input
              id="form-category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </div>
          <div className="wide">
            <Label htmlFor="form-description">안내 문구</Label>
            <Textarea
              id="form-description"
              rows={2}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
        </div>
        <div className="question-editor">
          <div className="question-head">
            <h3>문항 구성</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft({
                  ...draft,
                  questions: [
                    ...draft.questions,
                    {
                      id: crypto.randomUUID(),
                      label: "",
                      type: "long_text",
                      required: false,
                    },
                  ],
                })
              }
            >
              <Plus /> 문항 추가
            </Button>
          </div>
          {draft.questions.map((question, index) => (
            <div className="question-row" key={question.id}>
              <span className="question-number">{index + 1}</span>
              <div>
                <Input
                  aria-label={`${index + 1}번 문항`}
                  value={question.label}
                  placeholder="학생에게 보여줄 질문을 입력하세요"
                  onChange={(e) =>
                    updateQuestion(question.id, { label: e.target.value })
                  }
                />
                <div className="question-options">
                  <select
                    value={question.type}
                    onChange={(e) =>
                      updateQuestion(question.id, {
                        type: e.target.value as Question["type"],
                      })
                    }
                  >
                    <option value="long_text">긴 글</option>
                    <option value="short_text">짧은 답</option>
                  </select>
                  <label>
                    <Switch
                      checked={question.required}
                      onCheckedChange={(checked) =>
                        updateQuestion(question.id, { required: checked })
                      }
                    />{" "}
                    필수 문항
                  </label>
                </div>
              </div>
              <button
                aria-label="문항 삭제"
                onClick={() =>
                  setDraft({
                    ...draft,
                    questions: draft.questions.filter(
                      (item) => item.id !== question.id,
                    ),
                  })
                }
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        <div className="editor-footer">
          {message && <span>{message}</span>}
          <Button onClick={save} disabled={saving} className="bg-[#314cc7]">
            <Save /> {saving ? "저장 중…" : "양식 저장"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function TeacherDashboard({
  forms,
  activities,
  onFormSaved,
}: {
  forms: ActivityForm[];
  activities: Activity[];
  onFormSaved: (form: ActivityForm) => void;
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">교사 관리 화면</p>
          <h1>학생 활동 설계와 성장 관찰</h1>
          <p className="subcopy">
            활동지 문항을 직접 구성하고 학생 기록에서 생활기록부 관찰 단서를
            확인하세요.
          </p>
        </div>
      </section>
      <section className="teacher-stats">
        <article>
          <span>
            <Users />
          </span>
          <div>
            <small>활동 학생</small>
            <b>{new Set(activities.map((item) => item.studentName)).size}명</b>
          </div>
        </article>
        <article>
          <span>
            <FileText />
          </span>
          <div>
            <small>누적 결과물</small>
            <b>{activities.length}개</b>
          </div>
        </article>
        <article>
          <span>
            <BookOpenCheck />
          </span>
          <div>
            <small>공개 활동지</small>
            <b>
              {forms.filter((form) => form.status === "published").length}개
            </b>
          </div>
        </article>
      </section>
      <FormManager forms={forms} onSaved={onFormSaved} />
      <section className="teacher-panel">
        <div className="section-heading">
          <div>
            <h2>최근 학생 활동</h2>
            <p>
              자동 생성된 단서는 반드시 원문을 확인한 뒤 참고 자료로 활용하세요.
            </p>
          </div>
        </div>
        <div className="teacher-activity-list">
          {activities.length ? (
            activities.map((activity) => (
              <article key={activity.id}>
                <div>
                  <b>{activity.studentName}</b>
                  <span>{activity.career}</span>
                </div>
                <div>
                  <h3>{activity.title}</h3>
                  <p>{activity.teacherClue}</p>
                </div>
                <strong>{activity.fitScore}%</strong>
              </article>
            ))
          ) : (
            <p className="empty-copy">아직 제출된 학생 활동이 없습니다.</p>
          )}
        </div>
      </section>
    </>
  );
}

function ReportDialog({
  form,
  profile,
  onClose,
  onSaved,
}: {
  form: ActivityForm | null;
  profile: Profile;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}) {
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"form" | "saving" | "done">("form");
  const [result, setResult] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  async function submit() {
    if (!form) return;
    if (
      !title.trim() ||
      form.questions.some((q) => q.required && !answers[q.id]?.trim())
    ) {
      setError("제목과 필수 문항을 모두 입력해 주세요.");
      return;
    }
    setError("");
    setStep("saving");
    const data = new FormData();
    data.set("title", title);
    data.set("career", profile.career);
    data.set("category", form.category);
    data.set("formId", form.id);
    data.set("answers", JSON.stringify(answers));
    if (file) data.set("file", file);
    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as {
        activity?: Activity;
        error?: string;
      };
      if (!response.ok || !payload.activity)
        throw new Error(payload.error ?? "저장하지 못했습니다.");
      setResult(payload.activity);
      onSaved(payload.activity);
      setStep("done");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "저장하지 못했습니다.",
      );
      setStep("form");
    }
  }
  return (
    <Dialog open={Boolean(form)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="upload-dialog max-h-[92vh] overflow-y-auto border-0 p-0 sm:max-w-[660px]">
        {step === "form" && form && (
          <>
            <DialogHeader className="border-b px-7 py-6">
              <DialogTitle>{form.title}</DialogTitle>
              <DialogDescription>{form.description}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 px-7 py-6">
              <div className="grid gap-2">
                <Label htmlFor="report-title">활동 제목 *</Label>
                <Input
                  id="report-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="활동을 잘 나타내는 제목"
                />
              </div>
              {form.questions.map((q) => (
                <div className="grid gap-2" key={q.id}>
                  <Label htmlFor={q.id}>
                    {q.label}
                    {q.required && " *"}
                  </Label>
                  {q.type === "short_text" ? (
                    <Input
                      id={q.id}
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                    />
                  ) : (
                    <Textarea
                      id={q.id}
                      rows={4}
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers({ ...answers, [q.id]: e.target.value })
                      }
                    />
                  )}
                </div>
              ))}
              <label className="dropzone">
                <UploadCloud />
                <b>{file?.name ?? "계획서·보고서 파일 첨부 (선택)"}</b>
                <span>PDF, DOCX, HWP · 최대 20MB</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.hwp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {error && <p className="form-error">{error}</p>}
            </div>
            <DialogFooter className="border-t px-7 py-5">
              <Button variant="ghost" onClick={onClose}>
                취소
              </Button>
              <Button onClick={submit} className="bg-[#314cc7]">
                <Sparkles /> 저장하고 분석하기
              </Button>
            </DialogFooter>
          </>
        )}
        {step === "saving" && (
          <div className="analysis-state">
            <div className="analysis-orbit">
              <BrainCircuit />
            </div>
            <DialogTitle>활동의 의미를 찾고 있어요</DialogTitle>
            <DialogDescription>
              핵심 키워드와 진로 연결 근거를 분석합니다.
            </DialogDescription>
            <Progress value={72} className="mt-4 h-2" />
          </div>
        )}
        {step === "done" && result && (
          <div className="done-state">
            <div className="done-check">
              <Check />
            </div>
            <DialogTitle>분석이 완료되었어요</DialogTitle>
            <DialogDescription>
              {profile.career} 연결도 {result.fitScore}%
            </DialogDescription>
            <div className="done-keywords">
              {result.keywords.map((keyword) => (
                <span key={keyword}>#{keyword}</span>
              ))}
            </div>
            <div className="done-insight">
              <Lightbulb />
              <p>
                <b>다음 탐구 제안</b>
                {result.nextStep}
              </p>
            </div>
            <Button onClick={onClose} className="w-full bg-[#314cc7]">
              확인
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({
  profile,
  open,
  onOpenChange,
  onSaved,
}: {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (profile: Profile) => void;
}) {
  const [name, setName] = useState(profile.displayName);
  const [career, setCareer] = useState(profile.career);
  const [interests, setInterests] = useState(
    profile.interests?.join(", ") ?? "",
  );
  const [error, setError] = useState("");
  async function save() {
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        career,
        interests: interests
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    const payload = (await response.json()) as {
      profile?: Profile;
      error?: string;
    };
    if (!response.ok || !payload.profile) {
      setError(payload.error ?? "저장하지 못했습니다.");
      return;
    }
    onSaved(payload.profile);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>나의 진로 설정</DialogTitle>
          <DialogDescription>
            현재 관심 분야에 맞춰 활동 분석과 다음 탐구 제안을 조정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="profile-name">이름</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-career">희망 진로 분야</Label>
            <Input
              id="profile-career"
              value={career}
              onChange={(e) => setCareer(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-interests">관심 키워드</Label>
            <Input
              id="profile-interests"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="쉼표로 구분: 기후, 수질, 데이터"
            />
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={save} className="bg-[#314cc7]">
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [forms, setForms] = useState<ActivityForm[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [view, setView] = useState<"student" | "teacher">("student");
  const [section, setSection] = useState<StudentSection>("today");
  const [reportForm, setReportForm] = useState<ActivityForm | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const session = await fetch("/api/auth/session");
        if (!session.ok) {
          window.location.replace("/");
          return;
        }
        const data = (await session.json()) as { profile: Profile };
        setProfile(data.profile);
        setView(data.profile.role === "teacher" ? "teacher" : "student");
        const [formResponse, activityResponse] = await Promise.all([
          fetch("/api/forms"),
          fetch("/api/activities"),
        ]);
        if (formResponse.ok)
          setForms(
            ((await formResponse.json()) as { forms: ActivityForm[] }).forms ??
              [],
          );
        if (activityResponse.ok)
          setActivities(
            ((await activityResponse.json()) as { activities: Activity[] })
              .activities ?? [],
          );
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const published = useMemo(
    () => forms.filter((form) => form.status === "published"),
    [forms],
  );
  async function logout() {
    clearSharedAuthSession();
    window.location.replace("/");
  }
  function openSection(next: StudentSection) {
    setSection(next);
    setView("student");
    setMobileOpen(false);
  }
  const writeFirstReport = () => published[0] && setReportForm(published[0]);
  if (loading || !profile)
    return (
      <main className="dashboard-loading">
        <Compass />
        <p>나의 활동을 불러오고 있어요…</p>
      </main>
    );
  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span>
            <Compass />
          </span>
          <b>커리어폴리오</b>
          <button onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>
        <nav aria-label="학생 활동 메뉴">
          <button
            className={
              section === "today" && view === "student" ? "active" : ""
            }
            onClick={() => openSection("today")}
            aria-current={
              section === "today" && view === "student" ? "page" : undefined
            }
          >
            <LayoutDashboard />
            오늘의 활동
          </button>
          <button
            className={
              section === "results" && view === "student" ? "active" : ""
            }
            onClick={() => openSection("results")}
            aria-current={
              section === "results" && view === "student" ? "page" : undefined
            }
          >
            <FileText />
            나의 결과물
          </button>
          <button
            className={
              section === "career" && view === "student" ? "active" : ""
            }
            onClick={() => openSection("career")}
            aria-current={
              section === "career" && view === "student" ? "page" : undefined
            }
          >
            <Compass />
            진로 탐색
          </button>
          <button
            className={
              section === "growth" && view === "student" ? "active" : ""
            }
            onClick={() => openSection("growth")}
            aria-current={
              section === "growth" && view === "student" ? "page" : undefined
            }
          >
            <BarChart3 />
            성장 리포트
          </button>
        </nav>
        {published[0] && (
          <div className="sidebar-guide">
            <span>
              <Lightbulb />
            </span>
            <b>작성 가능한 활동지</b>
            <p>{published[0].title}</p>
            <button onClick={() => setReportForm(published[0])}>
              작성하기 <ArrowRight />
            </button>
          </div>
        )}
        <div className="profile">
          <div className="avatar">{profile.displayName.slice(-2)}</div>
          <div>
            <b>{profile.displayName}</b>
            <span>{profile.career}</span>
          </div>
          <button onClick={logout} aria-label="로그아웃">
            <LogOut />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu />
          </button>
          <div className="mobile-brand">
            <Compass />
            <b>커리어폴리오</b>
          </div>
          {profile.role === "teacher" ? (
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as typeof view)}
            >
              <TabsList className="role-tabs">
                <TabsTrigger value="student">
                  <GraduationCap /> 학생 화면
                </TabsTrigger>
                <TabsTrigger value="teacher">
                  <Users /> 교사 관리
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : (
            <span className="topbar-label">
              <GraduationCap /> 학생
            </span>
          )}
          <div className="top-actions">
            <button aria-label="알림">
              <Bell />
            </button>
            <span />
            <div>
              <b>{profile.displayName}</b>
              <small>
                {profile.role === "teacher"
                  ? "교사 계정"
                  : `${profile.career} 진로`}
              </small>
            </div>
          </div>
        </header>
        <div className="content-wrap">
          {view === "teacher" ? (
            <TeacherDashboard
              forms={forms}
              activities={activities}
              onFormSaved={(form) =>
                setForms((current) => [
                  form,
                  ...current.filter((item) => item.id !== form.id),
                ])
              }
            />
          ) : section === "today" ? (
            <StudentDashboard
              profile={profile}
              items={activities}
              forms={published}
              onWrite={setReportForm}
              onEditProfile={() => setProfileOpen(true)}
            />
          ) : section === "results" ? (
            <ResultsView items={activities} onWrite={writeFirstReport} />
          ) : section === "career" ? (
            <CareerView
              profile={profile}
              items={activities}
              onEditProfile={() => setProfileOpen(true)}
              onWrite={writeFirstReport}
            />
          ) : (
            <GrowthView items={activities} />
          )}
        </div>
      </div>
      <ReportDialog
        form={reportForm}
        profile={profile}
        onClose={() => setReportForm(null)}
        onSaved={(activity) =>
          setActivities((current) => [activity, ...current])
        }
      />
      <ProfileDialog
        profile={profile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        onSaved={setProfile}
      />
    </main>
  );
}
