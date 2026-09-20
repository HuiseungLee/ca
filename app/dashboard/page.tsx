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
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  clearSharedAuthSession,
  restoreSharedAuthSession,
} from "@/lib/shared-auth";
import { individualActivityForm } from "@/lib/default-content";
import { PortfolioSupport } from "@/components/portfolio-support";
import { AccountDialog } from "@/components/account-dialog";
import { buildPortfolio, type InquirySuggestion } from "@/lib/portfolio";

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
  distributionMode: "all" | "group" | "individual";
  targetIds: string[];
  projectId?: string | null;
};
type Activity = {
  id: string;
  ownerId?: string;
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
  answers?: Record<string, string>;
  evidence?: string;
  formId?: string | null;
  summary?: string;
  teacherFeedback?: string;
  feedbackBy?: string;
  feedbackAt?: string;
  parentActivityIds?: string[];
  questionSnapshot?: Question[];
  fileName?: string | null;
};
type StudentRecord = Profile & { activities: Activity[] };
type StudentGroup = { id: string; name: string; memberIds: string[] };
type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  applicantIds: string[];
  selectedIds: string[];
};
type Announcement = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
};
type StudentSection = "today" | "results" | "career" | "growth";
type TeacherSection =
  | "overview"
  | "forms"
  | "projects"
  | "notices"
  | "connections"
  | "ai";

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
  onSelectActivity,
  onExplore,
}: {
  profile: Profile;
  items: Activity[];
  forms: ActivityForm[];
  onWrite: (form: ActivityForm) => void;
  onEditProfile: () => void;
  onSelectActivity: (activity: Activity) => void;
  onExplore: () => void;
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
            onClick={() => onWrite(individualActivityForm)}
            className="h-11 rounded-xl bg-[#314cc7] px-5"
          >
            <Plus /> 개별 탐구 과제 작성
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
          <button className="text-link" onClick={onExplore}>
            진로 심화활동 제안 보기 <ArrowRight />
          </button>
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
              <article
                className="activity-row clickable-activity"
                key={activity.id}
                role="button"
                tabIndex={0}
                aria-label={`${activity.title} 답변 보기`}
                onClick={() => onSelectActivity(activity)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectActivity(activity);
                  }
                }}
              >
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
                  <small>기본 분석 연결도</small>
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
            <Button onClick={() => onWrite(individualActivityForm)}>
              첫 개별 탐구 작성
            </Button>
          </div>
        )}
      </section>
      <section className="assigned-forms">
        <div className="section-heading">
          <div>
            <h2>배포받은 활동지</h2>
            <p>교사가 전체·그룹·개별 배포한 과제입니다.</p>
          </div>
        </div>
        <div>
          {forms.map((form) => (
            <article key={form.id}>
              <span>{form.category}</span>
              <h3>{form.title}</h3>
              <p>{form.description}</p>
              <Button variant="outline" onClick={() => onWrite(form)}>
                활동지 작성
              </Button>
            </article>
          ))}
          {!forms.length && (
            <p className="empty-copy">
              배포받은 활동지가 없습니다. 개별 탐구는 언제든 작성할 수 있습니다.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function ResultsView({
  items,
  onWrite,
  onSelect,
}: {
  items: Activity[];
  onWrite: () => void;
  onSelect: (activity: Activity) => void;
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
          <Plus /> 개별 탐구 과제 작성
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
              <article
                className="activity-row clickable-activity"
                key={activity.id}
                onClick={() => onSelect(activity)}
              >
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
                <button
                  className="edit-activity-button"
                  aria-label="결과물 수정"
                >
                  <Pencil />
                </button>
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
  projects,
  onProjectApplied,
  onStartSuggestion,
  onOpenActivity,
}: {
  profile: Profile;
  items: Activity[];
  onEditProfile: () => void;
  onWrite: () => void;
  projects: Project[];
  onProjectApplied: (project: Project) => void;
  onStartSuggestion: (suggestion: InquirySuggestion) => void;
  onOpenActivity: (id: string) => void;
}) {
  const keywords = [...new Set(items.flatMap((item) => item.keywords))].slice(
    0,
    8,
  );
  const latest = items[0];
  async function apply(project: Project) {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "apply", id: project.id }),
    });
    const payload = (await response.json()) as { project?: Project };
    if (payload.project) onProjectApplied(payload.project);
  }
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
      <PortfolioSupport
        career={profile.career}
        activities={items}
        onOpen={onOpenActivity}
        onStart={onStartSuggestion}
      />
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
      <section className="pathway-section project-opportunities">
        <div className="section-heading">
          <div>
            <h2>참가 가능한 프로젝트</h2>
            <p>
              관심 있는 프로젝트에 신청하면 교사가 선발 후 전용 활동지를 배포할
              수 있습니다.
            </p>
          </div>
        </div>
        <div className="project-card-grid">
          {projects
            .filter((project) => project.status === "open")
            .map((project) => {
              const applied = project.applicantIds.includes(profile.id);
              const selected = project.selectedIds.includes(profile.id);
              return (
                <article key={project.id}>
                  <FolderKanban />
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                  </div>
                  <Button
                    variant={applied ? "outline" : "default"}
                    disabled={applied}
                    onClick={() => apply(project)}
                  >
                    {selected
                      ? "선발 완료"
                      : applied
                        ? "신청 완료"
                        : "참가 신청"}
                  </Button>
                </article>
              );
            })}
          {!projects.some((project) => project.status === "open") && (
            <p className="empty-copy">
              현재 참가 신청을 받는 프로젝트가 없습니다.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function GrowthView({
  items,
  career,
  onOpen,
}: {
  items: Activity[];
  career: string;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">기록의 연결과 변화</p>
          <h1>성장 리포트</h1>
          <p className="subcopy">
            직접 연결한 탐구와 공통 개념을 확인하고 다음 활동의 근거를
            찾아보세요.
          </p>
        </div>
      </section>
      <PortfolioSupport
        career={career}
        activities={items}
        onOpen={onOpen}
        graphOnly
      />
    </>
  );
}

function FormManager({
  forms,
  students,
  groups,
  projects,
  onSaved,
}: {
  forms: ActivityForm[];
  students: StudentRecord[];
  groups: StudentGroup[];
  projects: Project[];
  onSaved: (form: ActivityForm) => void;
}) {
  const blank = (): ActivityForm => ({
    id: "",
    title: "새 활동 보고서",
    description: "",
    category: "공통 과제",
    status: "draft",
    distributionMode: "all",
    targetIds: [],
    projectId: null,
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
            <select
              className="form-select"
              id="form-category"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              <option>공통 과제</option>
              <option>진로 탐색 과제</option>
              <option>심화 탐구 과제</option>
              <option>프로젝트 과제</option>
              <option>개별 탐구 과제</option>
            </select>
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
        <div className="distribution-editor">
          <div>
            <Label htmlFor="distribution-mode">배포 대상</Label>
            <select
              id="distribution-mode"
              className="form-select"
              value={draft.distributionMode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  distributionMode: e.target
                    .value as ActivityForm["distributionMode"],
                  targetIds: [],
                })
              }
            >
              <option value="all">전체 학생</option>
              <option value="group">특정 그룹</option>
              <option value="individual">개별 학생</option>
            </select>
          </div>
          {draft.category === "프로젝트 과제" && (
            <div>
              <Label htmlFor="form-project">연결 프로젝트</Label>
              <select
                id="form-project"
                className="form-select"
                value={draft.projectId ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, projectId: e.target.value || null })
                }
              >
                <option value="">연결 안 함</option>
                {projects.map((project) => (
                  <option value={project.id} key={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              {draft.projectId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const project = projects.find(
                      (item) => item.id === draft.projectId,
                    );
                    setDraft({
                      ...draft,
                      distributionMode: "individual",
                      targetIds: project?.selectedIds ?? [],
                    });
                  }}
                >
                  선발 학생 불러오기
                </Button>
              )}
            </div>
          )}
          {draft.distributionMode !== "all" && (
            <div className="distribution-targets">
              <Label>
                {draft.distributionMode === "group"
                  ? "배포할 그룹"
                  : "배포할 학생"}
              </Label>
              <div>
                {(draft.distributionMode === "group" ? groups : students).map(
                  (target) => (
                    <label key={target.id}>
                      <Checkbox
                        checked={draft.targetIds.includes(target.id)}
                        onCheckedChange={(checked) =>
                          setDraft({
                            ...draft,
                            targetIds: checked
                              ? [...draft.targetIds, target.id]
                              : draft.targetIds.filter(
                                  (id) => id !== target.id,
                                ),
                          })
                        }
                      />
                      <span>
                        {"name" in target ? target.name : target.displayName}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>
          )}
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
  students,
  groups,
  projects,
  announcements,
  onFormSaved,
  onGroupSaved,
  onProjectSaved,
  onAnnouncementSaved,
  tab,
  setTab,
  onActivitySaved,
}: {
  forms: ActivityForm[];
  activities: Activity[];
  students: StudentRecord[];
  groups: StudentGroup[];
  projects: Project[];
  announcements: Announcement[];
  onFormSaved: (form: ActivityForm) => void;
  onGroupSaved: (group: StudentGroup) => void;
  onProjectSaved: (project: Project) => void;
  onAnnouncementSaved: (announcement: Announcement) => void;
  tab: TeacherSection;
  setTab: (tab: TeacherSection) => void;
  onActivitySaved: (activity: Activity) => void;
}) {
  const [graphStudentId, setGraphStudentId] = useState("");
  const graphStudent =
    students.find((student) => student.id === graphStudentId) ?? students[0];
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(
    null,
  );
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [managementBusy, setManagementBusy] = useState(false);
  async function manage(action: () => Promise<void>) {
    if (managementBusy) return;
    setManagementBusy(true);
    setMessage("");
    try {
      await action();
    } catch {
      setMessage(
        "저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setManagementBusy(false);
    }
  }

  async function saveNotice() {
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: noticeTitle,
        content: noticeContent,
        status: "published",
      }),
    });
    const payload = (await response.json()) as {
      announcement?: Announcement;
      error?: string;
    };
    if (!response.ok || !payload.announcement)
      return setMessage(payload.error ?? "공지사항을 저장하지 못했습니다.");
    onAnnouncementSaved(payload.announcement);
    setNoticeTitle("");
    setNoticeContent("");
    setMessage("공지사항을 공개했습니다.");
  }
  async function saveGroup() {
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: groupName, memberIds: groupMembers }),
    });
    const payload = (await response.json()) as {
      group?: StudentGroup;
      error?: string;
    };
    if (!response.ok || !payload.group)
      return setMessage(payload.error ?? "그룹을 저장하지 못했습니다.");
    onGroupSaved(payload.group);
    setGroupName("");
    setGroupMembers([]);
    setMessage("학생 그룹을 만들었습니다.");
  }
  async function saveProject() {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: projectTitle,
        description: projectDescription,
      }),
    });
    const payload = (await response.json()) as {
      project?: Project;
      error?: string;
    };
    if (!response.ok || !payload.project)
      return setMessage(payload.error ?? "프로젝트를 만들지 못했습니다.");
    onProjectSaved(payload.project);
    setProjectTitle("");
    setProjectDescription("");
    setMessage("프로젝트 참가 신청을 열었습니다.");
  }
  async function selectApplicants(project: Project, selectedIds: string[]) {
    const response = await fetch("/api/projects", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: project.id,
        selectedIds,
        status: project.status,
      }),
    });
    const payload = (await response.json()) as {
      project?: Project;
      error?: string;
    };
    if (payload.project) onProjectSaved(payload.project);
    else setMessage(payload.error ?? "선발 정보를 저장하지 못했습니다.");
  }
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">교사 관리 화면</p>
          <h1>학생 활동 설계와 성장 관찰</h1>
          <p className="subcopy">
            학생별 탐구 흐름을 확인하고 답변에 직접 피드백을 남겨주세요.
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
            <b>{new Set(activities.map((item) => item.ownerId)).size}명</b>
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
      <div className="teacher-mode-tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          <Users />
          학생 활동
        </button>
        <button
          className={tab === "forms" ? "active" : ""}
          onClick={() => setTab("forms")}
        >
          <ClipboardCheck />
          활동지·배포
        </button>
        <button
          className={tab === "projects" ? "active" : ""}
          onClick={() => setTab("projects")}
        >
          <FolderKanban />
          프로젝트·그룹
        </button>
        <button
          className={tab === "notices" ? "active" : ""}
          onClick={() => setTab("notices")}
        >
          <Megaphone />
          공지사항
        </button>
      </div>
      {tab === "forms" && (
        <FormManager
          key={forms.map((form) => form.id).join("|")}
          forms={forms}
          students={students}
          groups={groups}
          projects={projects}
          onSaved={onFormSaved}
        />
      )}
      {tab === "overview" && (
        <section className="teacher-panel">
          <div className="section-heading">
            <div>
              <h2>최근 학생 활동</h2>
              <p>
                제목을 누르면 답변과 피드백을, 학생 이름을 누르면 전체 기록을 볼
                수 있습니다.
              </p>
            </div>
          </div>
          <div className="teacher-activity-list">
            {activities.length ? (
              activities.map((activity) => (
                <article
                  key={activity.id}
                  className="clickable-activity"
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div>
                    <button
                      className="student-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        const student = students.find(
                          (item) => item.id === activity.ownerId,
                        );
                        if (student) setSelectedStudent(student);
                      }}
                    >
                      {activity.studentName}
                    </button>
                    <span>{activity.career}</span>
                  </div>
                  <div>
                    <h3>
                      <button
                        className="activity-title-button"
                        onClick={() => setSelectedActivity(activity)}
                      >
                        {activity.title}
                      </button>
                    </h3>
                    <p>{activity.teacherFeedback || "피드백 작성 대기"}</p>
                  </div>
                  <strong>{activity.fitScore}%</strong>
                </article>
              ))
            ) : (
              <p className="empty-copy">아직 제출된 학생 활동이 없습니다.</p>
            )}
          </div>
          <div className="student-progress-list">
            <div className="section-heading">
              <div>
                <h2>학생별 진로 설계 흐름</h2>
                <p>
                  활동의 수, 평균 적합도와 과제 유형의 폭을 함께 확인합니다.
                </p>
              </div>
            </div>
            {students.map((student) => {
              const records = student.activities;
              const average = records.length
                ? Math.round(
                    records.reduce((sum, item) => sum + item.fitScore, 0) /
                      records.length,
                  )
                : 0;
              const flow = buildPortfolio(student.career, records);
              const level = records.length
                ? `직접 연결 ${flow.explicitCount}개 · 핵심 개념 ${flow.covered.length}개`
                : "첫 활동 대기";
              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                >
                  <span className="student-avatar">
                    {student.displayName.slice(-2)}
                  </span>
                  <div>
                    <b>{student.displayName}</b>
                    <small>
                      {student.career} · {records.length}개 활동
                    </small>
                  </div>
                  <span
                    className={`trajectory ${average >= 65 ? "good" : "watch"}`}
                  >
                    {level}
                  </span>
                  <strong>{average}%</strong>
                  <ChevronRight />
                </button>
              );
            })}
          </div>
        </section>
      )}
      {tab === "projects" && (
        <section className="management-grid">
          <article className="management-card">
            <span className="section-kicker">
              <UserCheck />
              학생 그룹 만들기
            </span>
            <h2>그룹 배포 대상</h2>
            <Label htmlFor="group-name">그룹 이름</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="예: A프로젝트 선발팀"
            />
            <div className="selection-list">
              {students.map((student) => (
                <label key={student.id}>
                  <Checkbox
                    checked={groupMembers.includes(student.id)}
                    onCheckedChange={(checked) =>
                      setGroupMembers(
                        checked
                          ? [...groupMembers, student.id]
                          : groupMembers.filter((id) => id !== student.id),
                      )
                    }
                  />
                  <span>{student.displayName}</span>
                  <small>{student.career}</small>
                </label>
              ))}
            </div>
            <Button disabled={managementBusy} onClick={() => manage(saveGroup)}>
              <Save />
              그룹 저장
            </Button>
            <div className="saved-chips">
              {groups.map((group) => (
                <span key={group.id}>
                  {group.name} · {group.memberIds.length}명
                </span>
              ))}
            </div>
          </article>
          <article className="management-card">
            <span className="section-kicker">
              <FolderKanban />
              프로젝트 참가 관리
            </span>
            <h2>프로젝트 개설</h2>
            <Label htmlFor="project-title">프로젝트 이름</Label>
            <Input
              id="project-title"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="예: A프로젝트"
            />
            <Label htmlFor="project-description">프로젝트 안내</Label>
            <Textarea
              id="project-description"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              rows={3}
            />
            <Button
              disabled={managementBusy}
              onClick={() => manage(saveProject)}
            >
              <Plus />
              참가 신청 열기
            </Button>
            <div className="project-admin-list">
              {projects.map((project) => (
                <div key={project.id}>
                  <b>{project.title}</b>
                  <span>
                    신청 {project.applicantIds.length}명 · 선발{" "}
                    {project.selectedIds.length}명
                  </span>
                  <label>
                    <span>그룹의 신청자 일괄 선발</span>
                    <select
                      className="form-select"
                      value=""
                      disabled={managementBusy}
                      onChange={(event) => {
                        const group = groups.find(
                          (item) => item.id === event.target.value,
                        );
                        if (group)
                          void manage(() =>
                            selectApplicants(project, [
                              ...new Set([
                                ...project.selectedIds,
                                ...group.memberIds.filter((id) =>
                                  project.applicantIds.includes(id),
                                ),
                              ]),
                            ]),
                          );
                      }}
                    >
                      <option value="">그룹 선택</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {project.applicantIds.map((id) => {
                    const student = students.find((item) => item.id === id);
                    return (
                      <label key={id}>
                        <Checkbox
                          checked={project.selectedIds.includes(id)}
                          disabled={managementBusy}
                          onCheckedChange={() =>
                            manage(() =>
                              selectApplicants(
                                project,
                                project.selectedIds.includes(id)
                                  ? project.selectedIds.filter(
                                      (selected) => selected !== id,
                                    )
                                  : [...project.selectedIds, id],
                              ),
                            )
                          }
                        />
                        <span>{student?.displayName ?? id}</span>
                        <small>선발</small>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
      {tab === "connections" && (
        <section className="teacher-panel">
          <Label htmlFor="graph-student">학생 선택</Label>
          <select
            id="graph-student"
            className="form-select"
            value={graphStudent?.id ?? ""}
            onChange={(event) => setGraphStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.displayName} · {student.career}
              </option>
            ))}
          </select>
          {graphStudent ? (
            <PortfolioSupport
              career={graphStudent.career}
              activities={graphStudent.activities}
              onOpen={(id) =>
                setSelectedActivity(
                  graphStudent.activities.find(
                    (activity) => activity.id === id,
                  ) ?? null,
                )
              }
            />
          ) : (
            <p className="empty-copy">등록된 학생이 없습니다.</p>
          )}
        </section>
      )}
      {tab === "ai" && (
        <section className="management-card">
          <span className="section-kicker">
            <Sparkles />
            교사용 AI 활용 안내
          </span>
          <h2>Gemini로 공통 탐구 자료 준비하기</h2>
          <p>
            현재 학생별 제안과 연결 지도는 사이트 내부의 기본 분석으로
            제공됩니다. 학생 답변·첨부파일은 외부 AI에 전송되지 않습니다.
          </p>
          <p>
            Gemini API 약관에는 18세 미만이 이용할 가능성이 있는 웹앱에 대한
            제한이 있고, 무료 입력·응답이 제품 개선에 활용될 수 있어 이 학생용
            사이트의 직접 API 연동은 활성화하지 않았습니다.
          </p>
          <ol>
            <li>
              성인 교사가 별도 작업 환경에서 학생 정보 없이 일반적인 전공별 탐구
              질문·평가 기준을 준비합니다.
            </li>
            <li>
              한 번 만든 자료를 검토·보관해 반복 호출을 줄입니다. 무료 한도는 AI
              Studio에서 확인합니다.
            </li>
            <li>
              검토한 문항을 ‘활동지·배포’에 넣고 학생의 수준과 프로젝트에 맞춰
              배포합니다.
            </li>
          </ol>
          <label htmlFor="gemini-prompt">
            학생 정보 없이 활용할 요청문 예시
          </label>
          <Textarea
            id="gemini-prompt"
            readOnly
            rows={5}
            value="화학공학 분야의 고등학교 수준 탐구 활동 3개를 설계해 주세요. 각 활동에 핵심 개념, 탐구 질문, 안전한 조사·비교 방법, 결과물, 교사가 확인할 질문을 포함해 주세요. 실제 학생 개인정보나 보고서는 사용하지 말고, 입학 가능성이나 학생 능력을 평가하지 마세요."
          />
          <div className="resource-links">
            <a
              href="https://ai.google.dev/gemini-api/terms"
              target="_blank"
              rel="noreferrer"
            >
              Google 이용 조건
            </a>
            <a
              href="https://ai.google.dev/gemini-api/docs/pricing"
              target="_blank"
              rel="noreferrer"
            >
              무료·유료 요금 기준
            </a>
            <a
              href="https://ai.google.dev/gemini-api/docs/rate-limits"
              target="_blank"
              rel="noreferrer"
            >
              호출 한도 확인
            </a>
          </div>
        </section>
      )}
      {message && tab !== "notices" && (
        <p role="status" className="manager-message">
          {message}
        </p>
      )}
      {tab === "notices" && (
        <section className="management-grid">
          <article className="management-card">
            <span className="section-kicker">
              <Megaphone />
              공지사항 작성
            </span>
            <h2>학생에게 알릴 내용</h2>
            <Label htmlFor="notice-title">제목</Label>
            <Input
              id="notice-title"
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.target.value)}
            />
            <Label htmlFor="notice-content">내용</Label>
            <Textarea
              id="notice-content"
              rows={6}
              value={noticeContent}
              onChange={(e) => setNoticeContent(e.target.value)}
            />
            <Button
              disabled={managementBusy}
              onClick={() => manage(saveNotice)}
            >
              <Megaphone />
              공지 공개
            </Button>
            {message && <p className="manager-message">{message}</p>}
          </article>
          <article className="management-card">
            <h2>공개된 공지</h2>
            <div className="notice-admin-list">
              {announcements.map((notice) => (
                <div key={notice.id}>
                  <b>{notice.title}</b>
                  <p>{notice.content}</p>
                  <time>
                    {new Intl.DateTimeFormat("ko-KR").format(
                      new Date(notice.createdAt),
                    )}
                  </time>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
      <ActivityDetailDialog
        key={selectedActivity?.id ?? "teacher-activity"}
        activity={selectedActivity}
        forms={forms}
        canEdit={false}
        canFeedback
        onClose={() => setSelectedActivity(null)}
        onSaved={onActivitySaved}
      />
      <StudentPortfolioDialog
        key={selectedStudent?.id ?? "portfolio"}
        student={
          students.find((student) => student.id === selectedStudent?.id) ?? null
        }
        forms={forms}
        onClose={() => setSelectedStudent(null)}
        onSaved={onActivitySaved}
      />
    </>
  );
}

function ActivityDetailDialog({
  activity,
  forms,
  canEdit,
  canFeedback = false,
  allActivities = [],
  onClose,
  onSaved,
}: {
  activity: Activity | null;
  forms: ActivityForm[];
  canEdit: boolean;
  canFeedback?: boolean;
  allActivities?: Activity[];
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}) {
  const [title, setTitle] = useState(activity?.title ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(
    activity?.answers ?? {},
  );
  const [parents, setParents] = useState(activity?.parentActivityIds ?? []);
  const [feedback, setFeedback] = useState(activity?.teacherFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const form =
    forms.find((item) => item.id === activity?.formId) ??
    (activity?.formId === individualActivityForm.id
      ? individualActivityForm
      : null);
  const storedQuestions = activity?.questionSnapshot?.length
    ? activity.questionSnapshot
    : (form?.questions ?? []);
  const questions = [
    ...storedQuestions,
    ...Object.keys(answers)
      .filter((id) => !storedQuestions.some((question) => question.id === id))
      .map((id, i) => ({
        id,
        label: `기존 답변 ${i + 1}`,
        type: "long_text" as const,
        required: false,
      })),
  ];
  async function save(feedbackOnly = false) {
    if (!activity || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        feedbackOnly ? "/api/feedback" : "/api/activities",
        {
          method: feedbackOnly ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            feedbackOnly
              ? { id: activity.id, teacherFeedback: feedback }
              : { id: activity.id, title, answers, parentActivityIds: parents },
          ),
        },
      );
      const payload = (await response.json()) as {
        activity?: Activity;
        error?: string;
      };
      if (!response.ok || !payload.activity)
        throw new Error(payload.error ?? "저장하지 못했습니다.");
      onSaved(payload.activity);
      onClose();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={Boolean(activity)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="activity-detail-dialog max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>
            {canEdit ? "나의 결과물 수정" : "학생 활동·교사 피드백"}
          </DialogTitle>
          <DialogDescription>
            {activity?.studentName} · {activity?.category}
          </DialogDescription>
        </DialogHeader>
        {activity && (
          <div className="activity-detail-body">
            <div>
              <Label htmlFor="detail-title">활동 제목</Label>
              <Input
                id="detail-title"
                value={title}
                readOnly={!canEdit}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            {questions.map((question) => (
              <div key={question.id}>
                <Label htmlFor={`detail-${question.id}`}>
                  {question.label}
                  {question.required && " *"}
                </Label>
                <Textarea
                  id={`detail-${question.id}`}
                  rows={4}
                  readOnly={!canEdit}
                  value={answers[question.id] ?? ""}
                  onChange={(event) =>
                    setAnswers({
                      ...answers,
                      [question.id]: event.target.value,
                    })
                  }
                />
              </div>
            ))}
            {!questions.length && activity.summary && (
              <p className="original-answer">{activity.summary}</p>
            )}
            {canEdit && (
              <ParentActivityPicker
                items={allActivities.filter(
                  (item) =>
                    item.id !== activity.id &&
                    new Date(item.createdAt) <= new Date(activity.createdAt),
                )}
                selected={parents}
                onChange={setParents}
              />
            )}
            {activity.fileName && (
              <a
                className="attachment-link"
                href={`/api/activities/file?id=${encodeURIComponent(activity.id)}`}
              >
                첨부파일 다운로드: {activity.fileName}
              </a>
            )}
            <div className="analysis-note">
              <b>기본 분석 · 진로 연결 근거</b>
              <p>{activity.evidence}</p>
              <p>{activity.nextStep}</p>
              <small>
                첨부파일 본문은 자동 분석하지 않습니다. 작성한 답변을 기준으로
                확인합니다.
              </small>
            </div>
            <div className="analysis-note teacher">
              <Label htmlFor="teacher-feedback">교사 피드백</Label>
              {canFeedback ? (
                <>
                  <Textarea
                    id="teacher-feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    maxLength={6000}
                    rows={5}
                    placeholder="잘한 점, 보완할 근거, 다음 활동 방향을 학생에게 알려주세요."
                  />
                  <Button onClick={() => save(true)} disabled={saving}>
                    {saving ? "저장 중…" : "피드백 저장·학생에게 공개"}
                  </Button>
                </>
              ) : (
                <p className="original-answer">
                  {activity.teacherFeedback ||
                    "아직 등록된 교사 피드백이 없습니다."}
                </p>
              )}
              {activity.feedbackAt && (
                <small>
                  {activity.feedbackBy} ·{" "}
                  {new Date(activity.feedbackAt).toLocaleDateString("ko-KR")}
                </small>
              )}
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          {canEdit && (
            <Button onClick={() => save()} disabled={saving}>
              <Save />
              {saving ? "저장 중…" : "수정 저장·재분석"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ParentActivityPicker({
  items,
  selected,
  onChange,
}: {
  items: Activity[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="parent-picker">
      <legend>이어지는 이전 활동 (선택)</legend>
      <p>이 과제의 출발점이 된 본인의 활동을 최대 10개 선택하세요.</p>
      {items.length ? (
        <div>
          {items.map((item) => (
            <label key={item.id}>
              <Checkbox
                checked={selected.includes(item.id)}
                disabled={!selected.includes(item.id) && selected.length >= 10}
                onCheckedChange={(checked) =>
                  onChange(
                    checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              />
              <span>{item.title}</span>
            </label>
          ))}
        </div>
      ) : (
        <p>첫 기록을 저장한 뒤 다음 활동부터 연결할 수 있어요.</p>
      )}
    </fieldset>
  );
}

function StudentPortfolioDialog({
  student,
  forms,
  onClose,
  onSaved,
}: {
  student: StudentRecord | null;
  forms: ActivityForm[];
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}) {
  const [detail, setDetail] = useState<Activity | null>(null);
  const records = student?.activities ?? [];
  const average = records.length
    ? Math.round(
        records.reduce((sum, item) => sum + item.fitScore, 0) / records.length,
      )
    : 0;
  return (
    <>
      <Dialog
        open={Boolean(student)}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className="student-portfolio-dialog max-h-[92vh] overflow-y-auto sm:max-w-[820px]">
          <DialogHeader>
            <DialogTitle>{student?.displayName} 학생의 전체 기록</DialogTitle>
            <DialogDescription>
              {student?.career} · 누적 {records.length}개 · 평균 진로 연결도{" "}
              {average}%
            </DialogDescription>
          </DialogHeader>
          <PortfolioSupport
            career={student?.career ?? "진로 탐색 중"}
            activities={records}
            onOpen={(id) =>
              setDetail(records.find((record) => record.id === id) ?? null)
            }
            graphOnly
          />
          <div className="portfolio-record-list">
            {records.map((activity) => (
              <button key={activity.id} onClick={() => setDetail(activity)}>
                <div>
                  <span>{activity.category}</span>
                  <h3>{activity.title}</h3>
                  <p>{activity.summary}</p>
                </div>
                <strong>{activity.fitScore}%</strong>
                <ChevronRight />
              </button>
            ))}
            {!records.length && (
              <p className="empty-copy">아직 작성한 활동이 없습니다.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ActivityDetailDialog
        key={detail?.id ?? "student-detail"}
        activity={detail}
        forms={forms}
        canEdit={false}
        canFeedback
        onClose={() => setDetail(null)}
        onSaved={onSaved}
      />
    </>
  );
}

function ReportDialog({
  form,
  profile,
  items,
  suggestion,
  onClose,
  onSaved,
}: {
  form: ActivityForm | null;
  profile: Profile;
  items: Activity[];
  suggestion?: InquirySuggestion | null;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}) {
  const [title, setTitle] = useState(suggestion?.title ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>(
    suggestion
      ? {
          motivation: `${suggestion.question}\n\n${suggestion.reason}`,
          process: suggestion.method,
          reflection: "",
        }
      : {},
  );
  const [parents, setParents] = useState<string[]>(
    suggestion?.parentActivityIds ?? [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"form" | "saving" | "done">("form");
  const [result, setResult] = useState<Activity | null>(null);
  const [error, setError] = useState("");
  async function submit() {
    if (!form || step === "saving") return;
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
    data.set("parentActivityIds", JSON.stringify(parents));
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
              <ParentActivityPicker
                items={items}
                selected={parents}
                onChange={setParents}
              />
              <p className="analysis-footnote">
                추천 문장은 출발점입니다. 실제로 계획하거나 수행한 내용에 맞게
                수정하세요. 분석은 아래 첨부파일이 아닌 작성한 답변을
                사용합니다.
              </p>
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

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [forms, setForms] = useState<ActivityForm[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [view, setView] = useState<"student" | "teacher">("student");
  const [section, setSection] = useState<StudentSection>("today");
  const [teacherSection, setTeacherSection] =
    useState<TeacherSection>("overview");
  const [suggestion, setSuggestion] = useState<InquirySuggestion | null>(null);
  const [reportForm, setReportForm] = useState<ActivityForm | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const configResponse = await fetch("/api/auth/config");
        if (configResponse.ok) {
          const config = (await configResponse.json()) as {
            url: string;
            key: string;
          };
          await restoreSharedAuthSession(config.url, config.key);
        }
        const session = await fetch("/api/auth/session");
        if (!session.ok) {
          window.location.replace("/");
          return;
        }
        const data = (await session.json()) as { profile: Profile };
        setProfile(data.profile);
        setView(data.profile.role === "teacher" ? "teacher" : "student");
        const teacher = data.profile.role === "teacher";
        const [
          formResponse,
          activityResponse,
          projectResponse,
          announcementResponse,
          studentResponse,
          groupResponse,
        ] = await Promise.all([
          fetch("/api/forms"),
          fetch("/api/activities"),
          fetch("/api/projects"),
          fetch(teacher ? "/api/announcements?all=1" : "/api/announcements"),
          teacher ? fetch("/api/students") : Promise.resolve(null),
          teacher ? fetch("/api/groups") : Promise.resolve(null),
        ]);
        if (
          [
            formResponse,
            activityResponse,
            projectResponse,
            announcementResponse,
            studentResponse,
            groupResponse,
          ].some((response) => response && !response.ok)
        )
          setLoadError(
            "일부 자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.",
          );
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
        if (projectResponse.ok)
          setProjects(
            ((await projectResponse.json()) as { projects: Project[] })
              .projects ?? [],
          );
        if (announcementResponse.ok)
          setAnnouncements(
            (
              (await announcementResponse.json()) as {
                announcements: Announcement[];
              }
            ).announcements ?? [],
          );
        if (studentResponse?.ok)
          setStudents(
            ((await studentResponse.json()) as { students: StudentRecord[] })
              .students ?? [],
          );
        if (groupResponse?.ok)
          setGroups(
            ((await groupResponse.json()) as { groups: StudentGroup[] })
              .groups ?? [],
          );
      } catch {
        setLoadError(
          "자료를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
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
  const ownActivities = activities.filter(
    (activity) => activity.ownerId === profile?.id,
  );
  const writeFirstReport = () => {
    setSuggestion(null);
    setReportForm(individualActivityForm);
  };
  const startSuggestion = (next: InquirySuggestion) => {
    setSuggestion(next);
    setReportForm(individualActivityForm);
  };
  const updateActivity = (updated: Activity) => {
    setActivities((current) =>
      current.some((item) => item.id === updated.id)
        ? current.map((item) => (item.id === updated.id ? updated : item))
        : [updated, ...current],
    );
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        activities: student.activities.map((activity) =>
          activity.id === updated.id ? updated : activity,
        ),
      })),
    );
  };
  if (!loading && !profile && loadError)
    return (
      <main className="dashboard-loading">
        <p role="alert">{loadError}</p>
        <Button onClick={() => window.location.reload()}>다시 불러오기</Button>
      </main>
    );
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
          <button aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)}>
            <X />
          </button>
        </div>
        {view === "teacher" ? (
          <nav aria-label="교사 관리 메뉴">
            {(
              [
                { id: "overview", label: "학생 활동·피드백", icon: Users },
                {
                  id: "connections",
                  label: "학생별 탐구 연결",
                  icon: BarChart3,
                },
                { id: "forms", label: "활동지·배포", icon: ClipboardCheck },
                { id: "projects", label: "프로젝트·그룹", icon: FolderKanban },
                { id: "notices", label: "공지사항", icon: Megaphone },
                { id: "ai", label: "AI 활용 안내", icon: Sparkles },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                className={teacherSection === item.id ? "active" : ""}
                aria-current={teacherSection === item.id ? "page" : undefined}
                onClick={() => {
                  setTeacherSection(item.id);
                  setMobileOpen(false);
                }}
              >
                <item.icon />
                {item.label}
              </button>
            ))}
          </nav>
        ) : (
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
        )}
        {view === "student" && published[0] && (
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
          <button
            className="profile-account-button"
            onClick={() => setProfileOpen(true)}
            aria-label="내 계정·프로필 열기"
          >
            <b>{profile.displayName}</b>
            <span>{profile.career}</span>
          </button>
          <button onClick={logout} aria-label="로그아웃">
            <LogOut />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" aria-label="메뉴 열기" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
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
            <button
              aria-label="공지사항 보기"
              onClick={() =>
                view === "teacher"
                  ? setTeacherSection("notices")
                  : window.location.assign("/#notices")
              }
            >
              <Bell />
            </button>
            <span />
            <button
              className="account-menu-button"
              onClick={() => setProfileOpen(true)}
              aria-label={`${profile.displayName} 계정·프로필 변경`}
            >
              <b>{profile.displayName}</b>
              <small>
                {profile.role === "teacher"
                  ? "교사 계정"
                  : `${profile.career} 진로`}
              </small>
            </button>
          </div>
        </header>
        <div className="content-wrap">
          {loadError && (
            <p role="alert" className="form-error">
              {loadError}
            </p>
          )}
          {profile.role === "teacher" && view === "student" && (
            <p className="preview-notice">
              학생 화면 미리보기 · 현재는 교사 본인의 기록으로 표시됩니다. 실제
              학생의 기록은 ‘교사 관리 → 학생별 탐구 연결’에서 확인하세요.
            </p>
          )}
          {view === "teacher" ? (
            <TeacherDashboard
              forms={forms}
              activities={activities}
              students={students}
              groups={groups}
              projects={projects}
              announcements={announcements}
              tab={teacherSection}
              setTab={setTeacherSection}
              onActivitySaved={updateActivity}
              onFormSaved={(form) =>
                setForms((current) => [
                  form,
                  ...current.filter((item) => item.id !== form.id),
                ])
              }
              onGroupSaved={(group) =>
                setGroups((current) => [
                  group,
                  ...current.filter((item) => item.id !== group.id),
                ])
              }
              onProjectSaved={(project) =>
                setProjects((current) => [
                  project,
                  ...current.filter((item) => item.id !== project.id),
                ])
              }
              onAnnouncementSaved={(announcement) =>
                setAnnouncements((current) => [
                  announcement,
                  ...current.filter((item) => item.id !== announcement.id),
                ])
              }
            />
          ) : section === "today" ? (
            <StudentDashboard
              profile={profile}
              items={ownActivities}
              forms={published}
              onWrite={(form) => {
                setSuggestion(null);
                setReportForm(form);
              }}
              onEditProfile={() => setProfileOpen(true)}
              onSelectActivity={setSelectedActivity}
              onExplore={() => setSection("career")}
            />
          ) : section === "results" ? (
            <ResultsView
              items={ownActivities}
              onWrite={writeFirstReport}
              onSelect={setSelectedActivity}
            />
          ) : section === "career" ? (
            <CareerView
              profile={profile}
              items={ownActivities}
              onEditProfile={() => setProfileOpen(true)}
              onWrite={writeFirstReport}
              onStartSuggestion={startSuggestion}
              onOpenActivity={(id) =>
                setSelectedActivity(
                  ownActivities.find((activity) => activity.id === id) ?? null,
                )
              }
              projects={projects}
              onProjectApplied={(project) =>
                setProjects((current) => [
                  project,
                  ...current.filter((item) => item.id !== project.id),
                ])
              }
            />
          ) : (
            <GrowthView
              items={ownActivities}
              career={profile.career}
              onOpen={(id) =>
                setSelectedActivity(
                  ownActivities.find((activity) => activity.id === id) ?? null,
                )
              }
            />
          )}
        </div>
      </div>
      {reportForm && (
        <ReportDialog
          form={reportForm}
          profile={profile}
          items={ownActivities}
          suggestion={suggestion}
          onClose={() => setReportForm(null)}
          onSaved={updateActivity}
        />
      )}
      {profileOpen && (
        <AccountDialog
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onSaved={(next) => {
            setProfile(next);
            fetch("/api/activities")
              .then(
                (response) =>
                  response.json() as Promise<{ activities?: Activity[] }>,
              )
              .then((payload) => {
                if (payload.activities) setActivities(payload.activities);
              })
              .catch(() =>
                setLoadError("분석 갱신은 새로고침 후 확인해 주세요."),
              );
          }}
        />
      )}
      <ActivityDetailDialog
        key={selectedActivity?.id ?? "own-activity"}
        activity={selectedActivity}
        forms={forms}
        canEdit
        allActivities={ownActivities}
        onClose={() => setSelectedActivity(null)}
        onSaved={updateActivity}
      />
    </main>
  );
}
