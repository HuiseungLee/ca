"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  FolderKanban,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  UploadCloud,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InquiryFormEditor } from "@/components/inquiry-form-editor";
import { InquiryReferencePanel } from "@/components/inquiry-reference-panel";
import { InquiryMaterialsField } from "@/components/inquiry-materials-field";
import {
  getProjectStages,
  stageEntry,
  nextStage,
  stageCoaching,
  entryStatusLabels,
  entryStageFields,
  inquiryFieldType,
  inquiryAnswerErrors,
  type InquiryAction,
  type InquiryBoard,
  type InquiryComment,
  type InquiryEntry,
  type InquiryProject,
  type InquiryTemplate,
  type InquiryTeam,
  type StageId,
  type StageSettings,
} from "@/lib/inquiry";
import type { InquirySuggestion } from "@/lib/portfolio";
import "./inquiry-workspace.css";

type Profile = {
  id: string;
  displayName: string;
  role: string;
  career: string;
};
type ActionResult = { board?: InquiryBoard; project?: InquiryProject };
type Act = (
  action: InquiryAction,
  success?: string,
  onFailure?: (message: string) => void,
) => Promise<InquiryBoard | null>;
type ExistingProject = { id: string; title: string; description: string };
const commentLabels: Record<InquiryComment["kind"], string> = {
  question: "질문",
  counter: "반론",
  evidence: "추가 근거",
  reply: "답변",
};
const dateLabel = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      })
    : "";
const nameOf = (board: InquiryBoard, id?: string | null) =>
  board.people.find((person) => person.id === id)?.displayName || "참가 학생";
const isLate = (date: string, status?: string) =>
  Boolean(
    date &&
      date < new Date().toLocaleDateString("en-CA") &&
      status !== "submitted" &&
      status !== "approved",
  );

async function readResponse<T>(response: Response): Promise<T> {
  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok)
    throw new Error(
      response.status === 409 &&
      /다른 화면|학생이 내용을 수정/.test(result.error || "")
        ? `${result.error || "다른 곳에서 기록이 변경되었습니다."} 입력한 내용은 그대로 유지했습니다. 내용을 복사한 뒤 최신 기록을 불러와 주세요.`
        : result.error ||
          "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  return result as T;
}

function Status({ entry }: { entry?: InquiryEntry }) {
  return (
    <span className={`iw-status iw-status-${entry?.status || "empty"}`}>
      {entry ? entryStatusLabels[entry.status] : "시작 전"}
    </span>
  );
}

export function InquiryWorkspace({
  profile,
  teacherMode,
  onStartFollowup,
  onProjectsChanged,
  onDirtyChange,
}: {
  profile: Profile;
  teacherMode: boolean;
  onStartFollowup: (suggestion: InquirySuggestion) => void;
  onProjectsChanged?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const teacher = teacherMode && profile.role === "teacher";
  const [projects, setProjects] = useState<InquiryProject[]>([]);
  const [existing, setExisting] = useState<ExistingProject[]>([]);
  const [board, setBoard] = useState<InquiryBoard | null>(null);
  const [activeId, setActiveId] = useState("");
  const activeRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [panel, setPanel] = useState<
    "overview" | "work" | "forms" | "settings"
  >("overview");
  const [teamId, setTeamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [stageId, setStageId] = useState<StageId>("sources");
  const [formStageId, setFormStageId] = useState<StageId>("sources");
  const [dirty, setDirty] = useState(false);
  const requestNumber = useRef(0);
  const inquiryStages = getProjectStages(
    board?.project || { template: "fusion" },
  );
  const stageIds = inquiryStages.map((stage) => stage.id);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  const canLeave = () =>
    !dirty ||
    window.confirm("저장하지 않은 내용이 있습니다. 저장하지 않고 이동할까요?");

  const loadProjects = useCallback(async () => {
    try {
      const result = await readResponse<{ projects: InquiryProject[] }>(
        await fetch("/api/inquiry"),
      );
      setProjects(result.projects);
      setError("");
      if (teacher) {
        const legacy = await readResponse<{ projects: ExistingProject[] }>(
          await fetch("/api/projects"),
        );
        setExisting(
          legacy.projects.filter(
            (project) =>
              !result.projects.some((item) => item.id === project.id),
          ),
        );
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "프로젝트를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [teacher]);

  useEffect(() => {
    // State updates occur after the asynchronous network request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
  }, [loadProjects]);
  useEffect(
    () => () => {
      requestNumber.current += 1;
    },
    [],
  );

  async function openProject(id: string) {
    if (!canLeave() || busy) return;
    const serial = ++requestNumber.current;
    activeRef.current = id;
    setActiveId(id);
    setBoard(null);
    setDirty(false);
    setLoading(true);
    setError("");
    setNotice("");
    setCreating(false);
    try {
      const { board: result } = await readResponse<{ board: InquiryBoard }>(
        await fetch(`/api/inquiry?projectId=${encodeURIComponent(id)}`),
      );
      if (serial !== requestNumber.current) return;
      const ownTeam = result.teams.find((team) =>
        team.memberIds.includes(profile.id),
      );
      const targetTeam = teacher ? result.teams[0] : ownTeam;
      setBoard(result);
      setTeamId(targetTeam?.id || "");
      setStudentId(teacher ? targetTeam?.memberIds[0] || "" : profile.id);
      setStageId(
        nextStage(
          result.entries,
          targetTeam?.id,
          profile.id,
          getProjectStages(result.project).map((stage) => stage.id),
        ),
      );
      setPanel(teacher ? "overview" : "work");
    } catch (failure) {
      if (serial === requestNumber.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "프로젝트를 불러오지 못했습니다.",
        );
    } finally {
      if (serial === requestNumber.current) setLoading(false);
    }
  }

  const act: Act = async (action, success = "저장했습니다.", onFailure) => {
    if (busy) return null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await readResponse<ActionResult>(
        await fetch("/api/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        }),
      );
      if (result.board) {
        const updated = result.board;
        setProjects((items) => [
          updated.project,
          ...items.filter((item) => item.id !== updated.project.id),
        ]);
        if (action.action === "create") {
          activeRef.current = updated.project.id;
          setActiveId(updated.project.id);
          setCreating(false);
          setPanel("forms");
          setFormStageId(getProjectStages(updated.project)[0].id);
          setTeamId("");
          setStudentId("");
          setStageId(getProjectStages(updated.project)[0].id);
        }
        if (activeRef.current === updated.project.id) setBoard(updated);
        if (
          action.action === "save" ||
          action.action === "review" ||
          action.action === "update" ||
          action.action === "team" ||
          action.action === "select" ||
          action.action === "publish_form" ||
          action.action === "create"
        )
          setDirty(false);
        setNotice(success);
        onProjectsChanged?.();
        return updated;
      }
      if (result.project)
        setProjects((items) =>
          items.map((item) =>
            item.id === result.project!.id ? result.project! : item,
          ),
        );
      setNotice(success);
      onProjectsChanged?.();
      return null;
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : "저장하지 못했습니다.";
      setError(message);
      onFailure?.(message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  function switchWork(team: string, stage: StageId, owner?: string) {
    if (busy || !canLeave()) return;
    setDirty(false);
    setTeamId(team);
    setStageId(stage);
    setStudentId(
      owner ||
        (teacher
          ? board?.teams.find((item) => item.id === team)?.memberIds[0] || ""
          : profile.id),
    );
    setPanel("work");
    setError("");
    setNotice("");
  }
  const visibleProjects = projects.filter(
    (project) =>
      (showArchived || !project.archived) &&
      (teacher ||
        project.status === "open" ||
        project.selectedIds.includes(profile.id) ||
        project.applicantIds.includes(profile.id)),
  );
  const selectedTeam = board?.teams.find((team) => team.id === teamId);
  const ownTeam = board?.teams.find((team) =>
    team.memberIds.includes(profile.id),
  );
  const ownMember = ownTeam;
  const allowedBoard =
    board && (teacher || board.project.selectedIds.includes(profile.id));

  return (
    <div className="inquiry-workspace">
      <header className="iw-heading">
        <div>
          <span className="iw-eyebrow">
            <FolderKanban size={15} /> 한 걸음씩 이어가는 탐구
          </span>
          <h1>{teacher ? "탐구 프로젝트 관리" : "탐구 프로젝트"}</h1>
          <p>
            {teacher
              ? "융합탐구 4종 양식 또는 팩트체크 6단계로 활동을 운영하고, 모둠의 진행 상황을 살펴보세요."
              : "함께 질문을 찾고, 근거를 확인하고, 나의 다음 탐구로 이어가세요."}
          </p>
        </div>
        {teacher && !activeId && (
          <Button
            onClick={() => {
              if (canLeave()) {
                setCreating(!creating);
                setDirty(false);
              }
            }}
            disabled={busy}
          >
            <Plus />
            프로젝트 만들기
          </Button>
        )}
      </header>
      {error && (
        <div className="iw-alert iw-error" role="alert">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || loading}
            onClick={() =>
              activeId ? void openProject(activeId) : void loadProjects()
            }
          >
            <RefreshCw />
            최신 기록 불러오기
          </Button>
        </div>
      )}
      {notice && (
        <p className="iw-alert iw-success" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}

      {!activeId && (
        <>
          <p className="iw-muted">
            융합탐구 활동 흐름 · 기존 팩트체크 프로젝트는 6단계로 운영됩니다.
          </p>
          <div className="iw-journey" aria-label="융합탐구 프로젝트 활동 순서">
            {inquiryStages.map((stage, index) => (
              <div key={stage.id}>
                <span>{index + 1}</span>
                <b>{stage.short}</b>
                {index < inquiryStages.length - 1 && (
                  <ChevronRight size={14} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
          {teacher && creating && (
            <CreateProject
              existing={existing}
              busy={busy}
              act={act}
              onDirty={setDirty}
            />
          )}
          <div className="iw-section-heading">
            <h2>{teacher ? "운영 중인 프로젝트" : "참여할 프로젝트"}</h2>
            <label className="iw-check">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              보관한 프로젝트 포함
            </label>
          </div>
          {loading ? (
            <div className="iw-empty" role="status">
              프로젝트를 불러오고 있습니다…
            </div>
          ) : visibleProjects.length ? (
            <div className="iw-project-grid">
              {visibleProjects.map((project) => {
                const selected = project.selectedIds.includes(profile.id),
                  applied = project.applicantIds.includes(profile.id);
                return (
                  <article className="iw-project-card" key={project.id}>
                    <div className="iw-card-top">
                      <span className="iw-project-icon">
                        <FolderKanban size={22} />
                      </span>
                      <span
                        className={`iw-pill ${project.archived ? "" : "iw-pill-blue"}`}
                      >
                        {project.archived
                          ? "보관됨"
                          : project.status === "open"
                            ? "참가 신청 중"
                            : "모집 마감"}
                      </span>
                    </div>
                    <h3>{project.title}</h3>
                    <p>
                      {project.description ||
                        "주장을 수집하고 근거를 검증하며 함께 결과물을 완성하는 프로젝트입니다."}
                    </p>
                    <div className="iw-project-meta">
                      <span>
                        {project.template === "fusion"
                          ? "융합탐구 · 4종 양식"
                          : "팩트체크 · 6단계"}
                      </span>
                      {teacher ? (
                        <span>
                          신청 {project.applicantIds.length}명 · 선발{" "}
                          {project.selectedIds.length}명
                        </span>
                      ) : (
                        <span>
                          {selected
                            ? "참가 확정"
                            : applied
                              ? "참가 승인 대기"
                              : "모둠 활동 + 개인 성찰"}
                        </span>
                      )}
                    </div>
                    {teacher || selected ? (
                      <Button
                        variant="outline"
                        onClick={() => void openProject(project.id)}
                      >
                        프로젝트 열기
                        <ArrowRight />
                      </Button>
                    ) : applied ? (
                      <p className="iw-wait">
                        <Clock3 size={16} />
                        교사의 참가 승인과 모둠 배정을 기다리고 있어요.
                      </p>
                    ) : project.status === "open" && !project.archived ? (
                      <Button
                        disabled={busy || profile.role === "teacher"}
                        onClick={() =>
                          void act(
                            { action: "apply", projectId: project.id },
                            "참가 신청을 보냈습니다. 교사의 승인을 기다려 주세요.",
                          )
                        }
                      >
                        참가 신청하기
                        <ArrowRight />
                      </Button>
                    ) : (
                      <p className="iw-muted">
                        현재 참가 신청이 마감되었습니다.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="iw-empty">
              <FolderKanban />
              <h3>
                {teacher
                  ? "첫 프로젝트를 시작해 보세요"
                  : "곧 새로운 탐구가 시작됩니다"}
              </h3>
              <p>
                {teacher
                  ? "프로젝트 만들기에서 활동 유형을 선택하면 작성 양식이 함께 준비됩니다."
                  : "교사가 프로젝트를 열면 이곳에서 참가 신청하고 활동을 이어갈 수 있어요."}
              </p>
              {teacher && !creating && (
                <Button onClick={() => setCreating(true)}>
                  <Plus />
                  프로젝트 만들기
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {activeId && (
        <>
          <Button
            className="iw-back"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (canLeave()) {
                requestNumber.current += 1;
                activeRef.current = "";
                setActiveId("");
                setBoard(null);
                setDirty(false);
                setLoading(false);
                setError("");
                setNotice("");
              }
            }}
          >
            <ArrowLeft />
            프로젝트 목록
          </Button>
          {loading ? (
            <div className="iw-empty" role="status">
              프로젝트 활동을 불러오고 있습니다…
            </div>
          ) : allowedBoard ? (
            <>
              <section className="iw-project-banner">
                <div>
                  <span className="iw-eyebrow">
                    {board.project.archived
                      ? "보관한 프로젝트"
                      : teacher
                        ? "프로젝트 운영 공간"
                        : "우리의 탐구 여정"}
                  </span>
                  <h2>{board.project.title}</h2>
                  <p>{board.project.description}</p>
                </div>
                <div className="iw-banner-side">
                  <span>
                    <Users size={17} />
                    {teacher
                      ? `${board.teams.length}개 모둠`
                      : ownTeam?.name || "모둠 배정 대기"}
                  </span>
                  {!teacher && ownTeam && (
                    <small>
                      {ownTeam.representativeId === profile.id
                        ? "모둠 대표 · 공동 기록 작성"
                        : "모둠원 · 토론 참여와 개인 성찰"}
                    </small>
                  )}
                  <small>
                    {board.project.template === "fusion"
                      ? "모둠 기록은 같은 모둠과 교사에게 · 개인 성찰은 본인과 교사에게"
                      : "모둠 기록은 참가자에게 · 개인 성찰은 본인과 교사에게"}
                  </small>
                </div>
              </section>
              {board.project.archived && (
                <p className="iw-alert">
                  보관된 프로젝트입니다. 기록을 조회할 수 있으며, 교사가 운영
                  설정에서 다시 열 수 있습니다.
                </p>
              )}
              {teacher && (
                <nav className="iw-tabs" aria-label="프로젝트 관리">
                  <button
                    aria-current={panel === "overview" ? "page" : undefined}
                    onClick={() => {
                      if (canLeave()) {
                        setDirty(false);
                        setPanel("overview");
                      }
                    }}
                  >
                    <FolderKanban size={16} />
                    진행 현황
                  </button>
                  <button
                    aria-current={panel === "work" ? "page" : undefined}
                    onClick={() => {
                      if (canLeave()) {
                        setDirty(false);
                        setPanel("work");
                      }
                    }}
                  >
                    <FileText size={16} />
                    기록과 피드백
                  </button>
                  <button
                    aria-current={panel === "forms" ? "page" : undefined}
                    disabled={busy}
                    onClick={() => {
                      if (canLeave()) {
                        setDirty(false);
                        setPanel("forms");
                      }
                    }}
                  >
                    <FileText size={16} />
                    활동지 편집·배포
                  </button>
                  <button
                    aria-current={panel === "settings" ? "page" : undefined}
                    onClick={() => {
                      if (canLeave()) {
                        setDirty(false);
                        setPanel("settings");
                      }
                    }}
                  >
                    <Settings2 size={16} />
                    운영 설정
                  </button>
                </nav>
              )}
              {teacher && panel === "overview" && (
                <TeacherOverview
                  board={board}
                  open={switchWork}
                  onSettings={() => setPanel("settings")}
                />
              )}
              {teacher && panel === "settings" && (
                <TeacherSettings
                  key={board.project.id}
                  board={board}
                  busy={busy}
                  act={act}
                  onDirty={setDirty}
                />
              )}
              {teacher && panel === "forms" && (
                <InquiryFormEditor
                  key={`${board.project.id}:${formStageId}`}
                  board={board}
                  busy={busy}
                  initialStageId={formStageId}
                  onDirty={setDirty}
                  onPublish={(action) =>
                    act(
                      action,
                      "문항을 저장·배포했습니다. 이 단계를 새로 시작하는 참가자에게 적용됩니다.",
                    )
                  }
                />
              )}
              {panel === "work" && (
                <>
                  {!teacher && !ownMember ? (
                    <div className="iw-empty">
                      <Users />
                      <h3>참가가 확정되었어요</h3>
                      <p>
                        교사가 모둠을 배정하면 이곳에서 첫 활동을 시작할 수
                        있어요.
                      </p>
                    </div>
                  ) : !board.teams.length ? (
                    <div className="iw-empty">
                      <Users />
                      <h3>모둠을 먼저 구성해 주세요</h3>
                      <p>
                        운영 설정에서 참가자를 선발하고 모둠을 배정할 수
                        있습니다.
                      </p>
                      <Button onClick={() => setPanel("settings")}>
                        운영 설정 열기
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="iw-work-selection">
                        <label>
                          활동 모둠
                          <select
                            value={teamId}
                            onChange={(event) => {
                              const team = board.teams.find(
                                (item) => item.id === event.target.value,
                              );
                              switchWork(
                                event.target.value,
                                inquiryStages[0].id,
                                teacher ? team?.memberIds[0] : profile.id,
                              );
                            }}
                          >
                            {board.teams
                              .filter(
                                (team) =>
                                  teacher ||
                                  team.id === ownTeam?.id ||
                                  board.entries.some(
                                    (entry) =>
                                      entry.teamId === team.id &&
                                      entry.status !== "draft",
                                  ),
                              )
                              .map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                  {team.id === ownTeam?.id
                                    ? " (우리 모둠)"
                                    : ""}
                                </option>
                              ))}
                          </select>
                        </label>
                        <p>
                          {selectedTeam?.memberIds
                            .map(
                              (id) =>
                                `${nameOf(board, id)}${selectedTeam.representativeId === id ? " (대표)" : ""}`,
                            )
                            .join(" · ")}
                        </p>
                      </div>
                      {!teacher &&
                        ownTeam &&
                        selectedTeam?.id === ownTeam.id && (
                          <div className="iw-next">
                            <Lightbulb size={22} />
                            <div>
                              <b>
                                지금 이어갈 활동:{" "}
                                {
                                  inquiryStages.find(
                                    (item) =>
                                      item.id ===
                                      nextStage(
                                        board.entries,
                                        ownTeam.id,
                                        profile.id,
                                        stageIds,
                                      ),
                                  )?.title
                                }
                              </b>
                              <p>
                                완벽한 문장보다 작은 기록부터. 임시저장하고
                                모둠원과 함께 보완해요.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() =>
                                switchWork(
                                  ownTeam.id,
                                  nextStage(
                                    board.entries,
                                    ownTeam.id,
                                    profile.id,
                                    stageIds,
                                  ),
                                  profile.id,
                                )
                              }
                            >
                              이어 쓰기
                              <ArrowRight />
                            </Button>
                          </div>
                        )}
                      <div
                        className={`iw-stage-nav ${board.project.template === "fusion" ? "iw-four-stages" : ""}`}
                        aria-label="활동 단계"
                      >
                        {inquiryStages
                          .filter(
                            (stage) =>
                              stage.id !== "reflection" ||
                              teacher ||
                              selectedTeam?.id === ownTeam?.id,
                          )
                          .map((stage, index) => {
                            const entry = stageEntry(
                              board.entries,
                              stage.id,
                              teamId,
                              teacher ? studentId : profile.id,
                            );
                            const settings = board.project.stages.find(
                              (item) => item.id === stage.id,
                            );
                            return (
                              <button
                                key={stage.id}
                                aria-current={
                                  stageId === stage.id ? "step" : undefined
                                }
                                onClick={() =>
                                  switchWork(teamId, stage.id, studentId)
                                }
                              >
                                <span className="iw-stage-number">
                                  {entry?.status === "approved" ? (
                                    <Check size={15} />
                                  ) : (
                                    index + 1
                                  )}
                                </span>
                                <b>{stage.short}</b>
                                <Status entry={entry} />
                                {settings?.dueDate && (
                                  <small
                                    className={
                                      isLate(settings.dueDate, entry?.status)
                                        ? "iw-overdue"
                                        : ""
                                    }
                                  >
                                    {dateLabel(settings.dueDate)}까지
                                  </small>
                                )}
                              </button>
                            );
                          })}
                      </div>
                      {teacher && stageId === "reflection" && (
                        <label className="iw-reflection-picker">
                          개인 성찰을 확인할 학생
                          <select
                            value={studentId}
                            onChange={(event) =>
                              switchWork(
                                teamId,
                                "reflection",
                                event.target.value,
                              )
                            }
                          >
                            {selectedTeam?.memberIds.map((id) => (
                              <option key={id} value={id}>
                                {nameOf(board, id)} ·{" "}
                                {board.people.find((person) => person.id === id)
                                  ?.career || "진로 탐색 중"}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {selectedTeam && (
                        <StageWorkspace
                          key={`${board.project.id}:${teamId}:${stageId}:${stageId === "reflection" ? studentId : "group"}`}
                          board={board}
                          team={selectedTeam}
                          stageId={stageId}
                          ownerId={teacher ? studentId : profile.id}
                          profile={profile}
                          teacher={teacher}
                          busy={busy}
                          act={act}
                          onDirty={setDirty}
                          onUpload={(entry) =>
                            setBoard((current) =>
                              current
                                ? {
                                    ...current,
                                    entries: current.entries.map((item) =>
                                      item.id === entry.id ? entry : item,
                                    ),
                                  }
                                : current,
                            )
                          }
                          onError={setError}
                          onStartFollowup={onStartFollowup}
                          onNextStage={(next) =>
                            switchWork(teamId, next, studentId)
                          }
                          onEditForm={() => {
                            if (canLeave()) {
                              setDirty(false);
                              setFormStageId(stageId);
                              setPanel("forms");
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            !error && (
              <div className="iw-empty">
                이 프로젝트에 참가한 학생만 활동 기록을 볼 수 있습니다.
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function CreateProject({
  existing,
  busy,
  act,
  onDirty,
}: {
  existing: ExistingProject[];
  busy: boolean;
  act: Act;
  onDirty: (value: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [template, setTemplate] = useState<InquiryTemplate>("fusion");
  return (
    <form
      className="iw-box iw-create"
      onSubmit={(event) => {
        event.preventDefault();
        void act(
          {
            action: "create",
            template,
            title,
            description,
            ...(projectId ? { projectId } : {}),
          },
          "프로젝트가 준비되었습니다. 참가자를 선발하고 모둠을 구성해 주세요.",
        );
      }}
    >
      <div className="iw-section-heading">
        <div>
          <h2>프로젝트 시작하기</h2>
          <p>
            모든 주제에 같은 탐구 흐름을 적용하고, 단계별 안내는 수정할 수
            있습니다.
          </p>
        </div>
      </div>
      <label>
        활동 유형
        <select
          value={template}
          onChange={(event) => {
            setTemplate(event.target.value as InquiryTemplate);
            onDirty(true);
          }}
        >
          <option value="fusion">
            융합탐구 프로젝트 · 계획서 / 물품 신청서 / 심화 보고서 / 성찰 일지
          </option>
          <option value="factcheck">
            팩트체크 프로젝트 · 주장 수집부터 개인 성찰까지 6단계
          </option>
        </select>
      </label>
      <p className="iw-muted">
        활동 유형은 생성 후 변경할 수 없습니다. 각 양식의 문항·안내·마감일은
        편집할 수 있습니다.
      </p>
      {existing.length > 0 && (
        <label>
          시작 방식
          <select
            value={projectId}
            onChange={(event) => {
              const previous = existing.find(
                (item) => item.id === event.target.value,
              );
              setProjectId(event.target.value);
              setTitle(previous?.title || "");
              setDescription(previous?.description || "");
              onDirty(true);
            }}
          >
            <option value="">새 프로젝트 만들기</option>
            {existing.map((project) => (
              <option value={project.id} key={project.id}>
                기존 프로젝트 연결: {project.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        프로젝트 이름
        <input
          required
          maxLength={150}
          placeholder="예: 우리 주변의 환경 주장은 믿을 만할까?"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            onDirty(true);
          }}
        />
      </label>
      <label>
        탐구 주제와 참여 안내
        <textarea
          rows={3}
          maxLength={5000}
          placeholder="함께 풀어볼 질문, 대상 학생, 모둠 구성 방식 등을 안내하세요."
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            onDirty(true);
          }}
        />
      </label>
      <div className="iw-actions">
        <p>
          {template === "fusion"
            ? "활동 전 계획서·물품 신청서, 활동 후 심화 보고서는 모둠장 제출 · 성찰 일지는 전원 개별 제출"
            : "주장 수집부터 개인 성찰까지 여섯 단계가 함께 만들어집니다."}
        </p>
        <Button type="submit" disabled={busy || !title.trim()}>
          <Plus />
          {busy ? "만드는 중…" : "프로젝트 만들기"}
        </Button>
      </div>
    </form>
  );
}

function TeacherOverview({
  board,
  open,
  onSettings,
}: {
  board: InquiryBoard;
  open: (teamId: string, stage: StageId, owner?: string) => void;
  onSettings: () => void;
}) {
  const inquiryStages = getProjectStages(board.project);
  const waiting = board.entries.filter((entry) => entry.status === "submitted");
  const revisions = board.entries.filter(
    (entry) => entry.status === "revision",
  );
  const progress = board.entries.filter(
    (entry) => entry.status === "approved",
  ).length;
  return (
    <>
      <div className="iw-stat-grid">
        <div>
          <span>참가 학생</span>
          <b>
            {board.project.selectedIds.length}
            <small>명</small>
          </b>
        </div>
        <div>
          <span>피드백 대기</span>
          <b>
            {waiting.length}
            <small>건</small>
          </b>
        </div>
        <div>
          <span>보완 진행</span>
          <b>
            {revisions.length}
            <small>건</small>
          </b>
        </div>
        <div>
          <span>확인 완료</span>
          <b>
            {progress}
            <small>건</small>
          </b>
        </div>
      </div>
      {!board.teams.length ? (
        <div className="iw-empty">
          <Users />
          <h3>참가자를 선발하고 첫 모둠을 만들어 주세요</h3>
          <p>
            신청 {board.project.applicantIds.length}명 · 참가 확정{" "}
            {board.project.selectedIds.length}명
          </p>
          <Button onClick={onSettings}>
            참가자·모둠 관리
            <ArrowRight />
          </Button>
        </div>
      ) : (
        <section className="iw-box">
          <div className="iw-section-heading">
            <div>
              <h2>모둠별 탐구 흐름</h2>
              <p>단계를 누르면 작성 내용과 교사 피드백을 확인할 수 있습니다.</p>
            </div>
          </div>
          <div className="iw-table-wrap">
            <table className="iw-progress-table">
              <thead>
                <tr>
                  <th scope="col">모둠</th>
                  {inquiryStages.map((stage) => (
                    <th scope="col" key={stage.id}>
                      {stage.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.teams.map((team) => (
                  <tr key={team.id}>
                    <th scope="row">
                      {team.name}
                      <small>
                        {team.memberIds.length}명 · 대표{" "}
                        {nameOf(board, team.representativeId)}
                      </small>
                    </th>
                    {inquiryStages.map((stage) => {
                      const entry = stageEntry(
                        board.entries,
                        stage.id,
                        team.id,
                        team.memberIds[0],
                      );
                      const reflections = board.entries.filter(
                        (item) =>
                          item.stageId === "reflection" &&
                          item.ownerId &&
                          team.memberIds.includes(item.ownerId) &&
                          item.status !== "draft",
                      );
                      return (
                        <td key={stage.id}>
                          <button
                            onClick={() =>
                              open(team.id, stage.id, team.memberIds[0])
                            }
                            aria-label={`${team.name} ${stage.title} 확인`}
                          >
                            {stage.id === "reflection" ? (
                              <span className="iw-reflection-count">
                                {reflections.length} / {team.memberIds.length}
                                <small>제출</small>
                              </span>
                            ) : (
                              <Status entry={entry} />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="iw-caption">
            진행 현황은 활동 기록 상태이며, 학업 능력이나 진로 적합성 점수가
            아닙니다.
          </p>
        </section>
      )}
      <section className="iw-box">
        <div className="iw-section-heading">
          <div>
            <h2>피드백을 기다리는 기록</h2>
            <p>잘한 점과 다음에 보완할 행동을 구체적으로 알려주세요.</p>
          </div>
          <span className="iw-pill iw-pill-blue">{waiting.length}건</span>
        </div>
        {waiting.length ? (
          <div className="iw-review-list">
            {waiting.map((entry) => {
              const team = board.teams.find(
                (item) =>
                  item.id === entry.teamId ||
                  (entry.ownerId && item.memberIds.includes(entry.ownerId)),
              );
              return (
                <button
                  key={entry.id}
                  onClick={() =>
                    team &&
                    open(team.id, entry.stageId, entry.ownerId || undefined)
                  }
                >
                  <span className="iw-record-icon">
                    <FileText size={19} />
                  </span>
                  <span>
                    <b>
                      {entry.stageId === "reflection"
                        ? `${nameOf(board, entry.ownerId)}의 개인 성찰`
                        : `${team?.name || "모둠"} · ${inquiryStages.find((stage) => stage.id === entry.stageId)?.title}`}
                    </b>
                    <small>{dateLabel(entry.updatedAt)} 제출</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        ) : (
          <p className="iw-muted">현재 피드백을 기다리는 제출물이 없습니다.</p>
        )}
      </section>
    </>
  );
}

function TeacherSettings({
  board,
  busy,
  act,
  onDirty,
}: {
  board: InquiryBoard;
  busy: boolean;
  act: Act;
  onDirty: (value: boolean) => void;
}) {
  const inquiryStages = getProjectStages(board.project);
  const [title, setTitle] = useState(board.project.title);
  const [description, setDescription] = useState(board.project.description);
  const [stages, setStages] = useState<StageSettings[]>(board.project.stages);
  const [status, setStatus] = useState<"open" | "closed">(
    board.project.status === "open" ? "open" : "closed",
  );
  const [archived, setArchived] = useState(board.project.archived);
  const [selected, setSelected] = useState(board.project.selectedIds);
  const [teamEditId, setTeamEditId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [representative, setRepresentative] = useState("");
  const [localError, setLocalError] = useState("");
  const [changedSection, setChangedSection] = useState("");
  function mark(section: string) {
    setChangedSection(section);
    onDirty(true);
  }
  const saved = () => {
    setChangedSection("");
    onDirty(false);
  };
  const locked = (section: string) =>
    busy || Boolean(changedSection && changedSection !== section);
  const candidateIds = [
    ...new Set([...board.project.applicantIds, ...board.project.selectedIds]),
  ];
  return (
    <div className="iw-settings-stack">
      {changedSection && (
        <p className="iw-alert" role="status">
          현재 수정 중인 항목을 저장한 뒤 다른 설정을 변경할 수 있습니다.
        </p>
      )}
      <form
        className="iw-box"
        onSubmit={async (event) => {
          event.preventDefault();
          if (
            await act(
              {
                action: "update",
                projectId: board.project.id,
                title,
                description,
                stages,
                archived,
                status,
              },
              "프로젝트 안내와 운영 설정을 저장했습니다.",
            )
          )
            saved();
        }}
      >
        <fieldset disabled={locked("settings")}>
          <legend>프로젝트 안내와 단계별 일정</legend>
          <div className="iw-two-columns">
            <label>
              프로젝트 이름
              <input
                required
                maxLength={150}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  mark("settings");
                }}
              />
            </label>
            <label>
              참가 신청
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as "open" | "closed");
                  mark("settings");
                }}
              >
                <option value="open">신청 받기</option>
                <option value="closed">모집 마감</option>
              </select>
            </label>
          </div>
          <label>
            전체 안내
            <textarea
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                mark("settings");
              }}
            />
          </label>
          <div className="iw-stage-settings">
            {inquiryStages.map((stage, index) => {
              const setting = stages.find((item) => item.id === stage.id);
              return (
                <details key={stage.id}>
                  <summary>
                    <span>
                      {index + 1}. {stage.title}
                    </span>
                    <small>
                      {setting?.dueDate
                        ? `${dateLabel(setting.dueDate)}까지`
                        : "기한 자유"}
                    </small>
                  </summary>
                  <label>
                    학생에게 보여줄 안내
                    <textarea
                      rows={3}
                      maxLength={4000}
                      value={setting?.instruction || ""}
                      onChange={(event) => {
                        setStages((items) =>
                          items.map((item) =>
                            item.id === stage.id
                              ? { ...item, instruction: event.target.value }
                              : item,
                          ),
                        );
                        mark("settings");
                      }}
                    />
                  </label>
                  <label>
                    제출 안내일
                    <input
                      type="date"
                      value={setting?.dueDate || ""}
                      onChange={(event) => {
                        setStages((items) =>
                          items.map((item) =>
                            item.id === stage.id
                              ? { ...item, dueDate: event.target.value }
                              : item,
                          ),
                        );
                        mark("settings");
                      }}
                    />
                  </label>
                </details>
              );
            })}
          </div>
          <label className="iw-check">
            <input
              type="checkbox"
              checked={archived}
              onChange={(event) => {
                setArchived(event.target.checked);
                mark("settings");
              }}
            />
            프로젝트 보관하기 (기록 조회는 유지하고 새 작성은 종료)
          </label>
          <div className="iw-actions">
            <span className="iw-muted">
              제출 안내일이 지나도 학생은 계속 작성할 수 있습니다.
            </span>
            <Button type="submit">
              <Save />
              운영 설정 저장
            </Button>
          </div>
        </fieldset>
      </form>
      <form
        className="iw-box"
        onSubmit={async (event) => {
          event.preventDefault();
          const updated = await act(
            {
              action: "select",
              projectId: board.project.id,
              selectedIds: selected,
            },
            "참가자를 선발했습니다. 아래에서 모둠을 구성해 주세요.",
          );
          if (updated) {
            setSelected(updated.project.selectedIds);
            saved();
          }
        }}
      >
        <fieldset disabled={locked("selection") || board.project.archived}>
          <legend>참가 신청과 선발</legend>
          <p className="iw-muted">
            학생이 프로젝트 목록에서 신청하면 아래에 표시됩니다. 선발 후 모둠을
            배정하세요.
          </p>
          {candidateIds.length ? (
            <>
              <div className="iw-selection-tools">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelected(candidateIds);
                    mark("selection");
                  }}
                >
                  신청자 전체 선택
                </Button>
                <span>{selected.length}명 선택</span>
              </div>
              <div className="iw-person-grid">
                {candidateIds.map((id) => {
                  const person = board.people.find((item) => item.id === id);
                  const assigned = board.teams.find((team) =>
                    team.memberIds.includes(id),
                  );
                  return (
                    <label className="iw-person" key={id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(id)}
                        disabled={Boolean(assigned)}
                        onChange={(event) => {
                          setSelected((items) =>
                            event.target.checked
                              ? [...items, id]
                              : items.filter((item) => item !== id),
                          );
                          mark("selection");
                        }}
                      />
                      <span>
                        <b>{person?.displayName || "참가 학생"}</b>
                        <small>
                          {assigned
                            ? `${assigned.name} 배정됨`
                            : person?.career || "진로 탐색 중"}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="iw-actions">
                <p>
                  모둠에 배정된 학생은 모둠 구성을 먼저 수정해야 선발을 해제할
                  수 있습니다.
                </p>
                <Button type="submit">
                  <Check />
                  참가자 선발 저장
                </Button>
              </div>
            </>
          ) : (
            <p className="iw-empty-inline">
              아직 참가 신청이 없습니다. 학생에게 ‘탐구 프로젝트 → 참가
              신청하기’를 안내해 주세요.
            </p>
          )}
        </fieldset>
      </form>
      <form
        className="iw-box"
        onSubmit={async (event) => {
          event.preventDefault();
          setLocalError("");
          if (!members.length || !members.includes(representative)) {
            setLocalError("모둠원을 선택하고 대표 학생을 지정해 주세요.");
            return;
          }
          const updated = await act(
            {
              action: "team",
              projectId: board.project.id,
              ...(teamEditId ? { id: teamEditId } : {}),
              name: teamName,
              memberIds: members,
              representativeId: representative,
            },
            "모둠 구성을 저장했습니다.",
          );
          if (updated) {
            setTeamEditId("");
            setTeamName("");
            setMembers([]);
            setRepresentative("");
            saved();
          }
        }}
      >
        <fieldset disabled={locked("team") || board.project.archived}>
          <legend>모둠 구성과 대표 지정</legend>
          <p className="iw-muted">
            대표는 모둠 공동 기록을 작성하고, 모둠원은 토론과 개인 성찰에
            참여합니다.
          </p>
          {board.teams.length > 0 && (
            <div className="iw-team-chips">
              {board.teams.map((team) => (
                <button
                  type="button"
                  className={teamEditId === team.id ? "selected" : ""}
                  key={team.id}
                  onClick={() => {
                    if (
                      !changedSection ||
                      window.confirm(
                        "작성 중인 모둠 설정을 저장하지 않고 바꿀까요?",
                      )
                    ) {
                      setTeamEditId(team.id);
                      setTeamName(team.name);
                      setMembers(team.memberIds);
                      setRepresentative(team.representativeId);
                      setChangedSection("");
                      onDirty(false);
                    }
                  }}
                >
                  <Users size={15} />
                  {team.name}
                  <small>{team.memberIds.length}명</small>
                </button>
              ))}
              {teamEditId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      !changedSection ||
                      window.confirm(
                        "작성 중인 모둠 설정을 저장하지 않고 바꿀까요?",
                      )
                    ) {
                      setTeamEditId("");
                      setTeamName("");
                      setMembers([]);
                      setRepresentative("");
                      setChangedSection("");
                      onDirty(false);
                    }
                  }}
                >
                  <Plus />새 모둠
                </Button>
              )}
            </div>
          )}
          <label>
            {teamEditId ? "모둠 이름 수정" : "새 모둠 이름"}
            <input
              required
              maxLength={80}
              value={teamName}
              placeholder="예: 1모둠 · 근거를 찾는 사람들"
              onChange={(event) => {
                setTeamName(event.target.value);
                mark("team");
              }}
            />
          </label>
          <div className="iw-person-grid">
            {board.project.selectedIds.map((id) => {
              const otherTeam = board.teams.find(
                (team) => team.id !== teamEditId && team.memberIds.includes(id),
              );
              return (
                <label className="iw-person" key={id}>
                  <input
                    type="checkbox"
                    disabled={Boolean(otherTeam)}
                    checked={members.includes(id)}
                    onChange={(event) => {
                      const updated = event.target.checked
                        ? [...members, id]
                        : members.filter((item) => item !== id);
                      setMembers(updated);
                      if (!updated.includes(representative))
                        setRepresentative(updated[0] || "");
                      mark("team");
                    }}
                  />
                  <span>
                    <b>{nameOf(board, id)}</b>
                    <small>
                      {otherTeam ? `${otherTeam.name} 배정됨` : "배정 가능"}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
          {!board.project.selectedIds.length && (
            <p className="iw-empty-inline">먼저 참가자를 선발해 주세요.</p>
          )}
          <label>
            대표 학생
            <select
              required
              value={representative}
              onChange={(event) => {
                setRepresentative(event.target.value);
                mark("team");
              }}
            >
              <option value="">대표를 선택하세요</option>
              {members.map((id) => (
                <option key={id} value={id}>
                  {nameOf(board, id)}
                </option>
              ))}
            </select>
          </label>
          {localError && (
            <p className="iw-error" role="alert">
              {localError}
            </p>
          )}
          <div className="iw-actions">
            <p>한 프로젝트에서 학생은 한 모둠에 참여합니다.</p>
            <Button
              type="submit"
              disabled={!teamName.trim() || !members.length}
            >
              <Users />
              {teamEditId ? "모둠 수정 저장" : "모둠 만들기"}
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

function StageWorkspace({
  board,
  team,
  stageId,
  ownerId,
  profile,
  teacher,
  busy,
  act,
  onDirty,
  onUpload,
  onError,
  onStartFollowup,
  onEditForm,
  onNextStage,
}: {
  board: InquiryBoard;
  team: InquiryTeam;
  stageId: StageId;
  ownerId: string;
  profile: Profile;
  teacher: boolean;
  busy: boolean;
  act: Act;
  onDirty: (value: boolean) => void;
  onUpload: (entry: InquiryEntry) => void;
  onError: (value: string) => void;
  onStartFollowup: (suggestion: InquirySuggestion) => void;
  onEditForm?: () => void;
  onNextStage: (stage: StageId) => void;
}) {
  const inquiryStages = getProjectStages(board.project);
  const stageIds = inquiryStages.map((stage) => stage.id);
  const entry = stageEntry(board.entries, stageId, team.id, ownerId);
  const [initialAnswers] = useState<Record<string, string>>(() => {
    if (entry) return entry.answers;
    if (board.project.template !== "fusion") return {};
    const now = new Date();
    const defaults: Record<string, string> = {
      school_year: String(now.getFullYear()),
      team_name: team.name,
      leader_name: nameOf(board, team.representativeId),
      student_name: profile.displayName,
      signature: profile.displayName,
      written_date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
    };
    // Only prefill unchanged default questions; custom questions may reuse an id.
    const defaultsFields = inquiryStages.find(
      (item) => item.id === stageId,
    )!.fields;
    return Object.fromEntries(
      entryStageFields(
        stageId,
        board.project.stages.find((item) => item.id === stageId),
      )
        .filter(
          (field) =>
            defaults[field.id] &&
            defaultsFields.some(
              (original) =>
                original.id === field.id && original.label === field.label,
            ),
        )
        .map((field) => [field.id, defaults[field.id]]),
    );
  });
  const [draftAnswers, setAnswers] =
    useState<Record<string, string>>(initialAnswers);
  const [draftVersion, setVersion] = useState(entry?.version || 0);
  const [modified, setModified] = useState(false);
  const answers = modified ? draftAnswers : entry?.answers || initialAnswers;
  const version = modified ? draftVersion : entry?.version || 0;
  const [review, setReview] = useState("");
  const [reviewDirty, setReviewDirty] = useState(false);
  const [commentDirty, setCommentDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveNotice, setSaveNotice] = useState("");
  const answerFormRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stage = inquiryStages.find((item) => item.id === stageId)!;
  const setting = board.project.stages.find((item) => item.id === stageId);
  const [startedForm] = useState(() => ({
    fields: entryStageFields(stageId, setting, entry),
    revision: entry?.formRevision ?? (entry ? 1 : (setting?.revision ?? 1)),
    instruction:
      entry?.instructionSnapshot ?? setting?.instruction ?? stage.description,
  }));
  const ownTeam = team.memberIds.includes(profile.id);
  const editing =
    !teacher &&
    !board.project.archived &&
    (stageId === "reflection"
      ? ownerId === profile.id && ownTeam
      : ownTeam && team.representativeId === profile.id);
  const priorId = stageIds[stageIds.indexOf(stageId) - 1];
  const prior = priorId
    ? stageEntry(board.entries, priorId, team.id, ownerId)
    : undefined;
  const priorReady = !priorId || Boolean(prior && prior.status !== "draft");
  const feedback = entry?.feedback.at(-1);
  const fields = editing
    ? startedForm.fields
    : entryStageFields(stageId, setting, entry);
  const tips = stageCoaching(
    stageId,
    answers,
    feedback,
    teacher
      ? board.people.find((person) => person.id === ownerId)?.career
      : profile.career,
    fields,
    board.project.template,
  );
  const dirty = modified || reviewDirty || commentDirty;

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  function changeAnswer(id: string, value: string) {
    setVersion(version);
    setAnswers({ ...answers, [id]: value });
    setModified(true);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setLocalError("");
    setSaveNotice("");
  }

  async function save(status: "draft" | "submitted") {
    if (!editing || busy || uploading) return;
    setLocalError("");
    setSaveNotice("");
    setFieldErrors({});
    if (status === "submitted") {
      const errors = inquiryAnswerErrors(fields, answers);
      const invalid = fields.find((field) => errors[field.id]);
      if (invalid) {
        setFieldErrors(errors);
        setLocalError(
          `제출하지 못했습니다. ‘${invalid.label}’ 문항을 확인해 주세요. 입력한 내용은 그대로 유지됩니다.`,
        );
        requestAnimationFrame(() => {
          const input =
            (answerFormRef.current?.elements.namedItem(
              invalid.id,
            ) as HTMLElement | null) ||
            document.getElementById(`iw-field-${invalid.id}`);
          input?.focus({ preventScroll: true });
          input?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return;
      }
      if (!priorReady) {
        setLocalError(
          "앞 단계의 기록을 먼저 제출해 주세요. 현재 내용은 임시저장할 수 있습니다.",
        );
        return;
      }
    }
    const updated = await act(
      {
        action: "save",
        projectId: board.project.id,
        ...(stageId === "reflection" ? {} : { teamId: team.id }),
        stageId,
        answers,
        status,
        version,
        formRevision: startedForm.revision,
      },
      status === "draft"
        ? "임시저장했습니다. 나중에 이어 쓸 수 있어요."
        : "제출했습니다. 교사 피드백을 확인하며 다음 단계를 이어가세요.",
      (message) => {
        setLocalError(
          `제출·저장하지 못했습니다. ${message} 입력한 내용은 유지됩니다.`,
        );
        requestAnimationFrame(() => errorRef.current?.focus());
      },
    );
    if (updated) {
      const latest = stageEntry(updated.entries, stageId, team.id, ownerId);
      setAnswers(latest?.answers || answers);
      setVersion(latest?.version || version);
      setModified(false);
      setSaveNotice(
        status === "submitted"
          ? "이 단계 제출이 완료되었습니다. 다음 단계를 이어가세요."
          : "임시저장했습니다. 나중에 이어서 작성할 수 있습니다.",
      );
      onDirty(reviewDirty || commentDirty);
    }
  }
  async function upload(file?: File) {
    if (!file || !entry) return;
    if (file.size > 20 * 1024 * 1024) {
      setLocalError("첨부파일은 20MB 이하로 선택해 주세요.");
      return;
    }
    setUploading(true);
    setLocalError("");
    try {
      const data = new FormData();
      data.set("entryId", entry.id);
      data.set("version", String(version));
      data.set("file", file);
      const result = await readResponse<{ entry: InquiryEntry }>(
        await fetch("/api/inquiry/files", { method: "POST", body: data }),
      );
      onUpload(result.entry);
      setVersion(result.entry.version);
    } catch (failure) {
      setLocalError(
        failure instanceof Error
          ? failure.message
          : "파일을 첨부하지 못했습니다.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function startFollowup() {
    if (
      dirty &&
      !window.confirm(
        "저장하지 않은 내용이 있습니다. 저장하지 않고 개별 탐구 과제로 이동할까요?",
      )
    )
      return;
    // Custom questions may reuse an original id with a different meaning.
    const originalAnswer = (id: string) => {
      const original = stage.fields.find((field) => field.id === id);
      const recorded = fields.find((field) => field.id === id);
      return original?.label === recorded?.label
        ? entry?.answers[id]
        : undefined;
    };
    onStartFollowup({
      id: `project-${board.project.id}-${profile.id}`,
      title: `${board.project.title}에서 이어가는 나의 탐구`,
      question:
        originalAnswer("next") ||
        "이번 프로젝트에서 더 확인하고 싶은 질문은 무엇인가요?",
      reason: `${board.project.title} 프로젝트의 개인 성찰에서 이어지는 탐구입니다. 진로 연결: ${originalAnswer("career") || profile.career || "관심 분야 탐색"}${board.project.template === "fusion" && originalAnswer("reflection") ? `\n나의 탐구 성찰: ${originalAnswer("reflection")}` : ""}`,
      method:
        "개인 성찰에서 적은 다음 행동을 실행하고, 새로운 근거와 관점의 변화를 기록하세요.",
      output: "후속 탐구 보고서와 근거 자료",
      parentActivityIds: [],
    });
  }
  return (
    <>
      <div className={`iw-work-grid ${priorId ? "iw-has-reference" : ""}`}>
        <section className="iw-box iw-editor">
          <div className="iw-section-heading">
            <div>
              <span className="iw-eyebrow">
                STEP {stageIds.indexOf(stageId) + 1} ·{" "}
                {stageId === "reflection"
                  ? `${teacher ? nameOf(board, ownerId) : "나"}의 기록`
                  : team.name}
              </span>
              <h2>{stage.title}</h2>
            </div>
            <Status entry={entry} />
          </div>
          <p className="iw-stage-instruction">
            {editing
              ? startedForm.instruction
              : entry?.instructionSnapshot ||
                setting?.instruction ||
                stage.description}
          </p>
          {board.project.template === "fusion" && (
            <p className="iw-private-note">
              {stageId === "reflection"
                ? "활동 후 · 모둠장 포함 전원 개별 제출"
                : `${stageId === "report" ? "활동 후" : "활동 전"} · 모둠장만 작성·제출 · 모둠원과 교사에게 공개`}
            </p>
          )}
          <div className="iw-form-version">
            <span>
              활동지 {entry?.formRevision ?? startedForm.revision}판 ·{" "}
              {fields.length}문항
            </span>
            {teacher && (
              <Button variant="outline" size="sm" onClick={onEditForm}>
                이 단계 문항 편집
              </Button>
            )}
          </div>
          {entry && (entry.formRevision ?? 1) < (setting?.revision ?? 1) && (
            <p className="iw-readonly-note">
              새 활동지가 배포되었으며, 이 기록은 처음 작성할 때의 문항을
              유지합니다.
            </p>
          )}
          {setting?.dueDate && (
            <p
              className={`iw-due ${isLate(setting.dueDate, entry?.status) ? "iw-overdue" : ""}`}
            >
              <Clock3 size={14} />
              {dateLabel(setting.dueDate)}까지 · 이후에도 작성할 수 있어요
            </p>
          )}
          {stageId === "reflection" && (
            <p className="iw-private-note">
              개인 성찰은 작성자와 교사에게만 공개됩니다.
            </p>
          )}
          {!editing && !teacher && stageId !== "reflection" && (
            <p className="iw-readonly-note">
              {ownTeam
                ? `모둠 대표 ${nameOf(board, team.representativeId)} 학생이 공동 기록을 작성합니다. 아래 토론에 의견과 근거를 남겨 주세요.`
                : "다른 모둠이 제출한 기록입니다. 아래 토론에서 질문과 의견을 나눌 수 있어요."}
            </p>
          )}
          {priorId && (
            <div className="iw-reference-mobile">
              <InquiryReferencePanel
                board={board}
                team={team}
                stageId={stageId}
                ownerId={ownerId}
              />
            </div>
          )}
          {entry || editing ? (
            <form
              ref={answerFormRef}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void save("submitted");
              }}
            >
              <fieldset disabled={busy || uploading}>
                <legend className="iw-sr-only">{stage.title} 작성 내용</legend>
                {fields.map((field) =>
                  inquiryFieldType(field) === "materials" ? (
                    <div className="iw-materials-question" key={field.id}>
                      <h3>
                        {field.label}{" "}
                        {field.required && (
                          <span className="iw-required">제출 시 필수</span>
                        )}
                      </h3>
                      <p className="iw-field-help">{field.placeholder}</p>
                      <InquiryMaterialsField
                        id={`iw-field-${field.id}`}
                        value={
                          (editing ? answers : entry?.answers)?.[field.id] || ""
                        }
                        readOnly={!editing}
                        onChange={
                          editing
                            ? (value) => changeAnswer(field.id, value)
                            : undefined
                        }
                        invalid={Boolean(fieldErrors[field.id])}
                        describedBy={
                          fieldErrors[field.id]
                            ? `iw-field-error-${field.id}`
                            : undefined
                        }
                      />
                      {fieldErrors[field.id] && (
                        <p
                          className="iw-field-error"
                          id={`iw-field-error-${field.id}`}
                          role="alert"
                        >
                          {fieldErrors[field.id]}
                        </p>
                      )}
                    </div>
                  ) : editing ? (
                    <label key={field.id} htmlFor={`iw-field-${field.id}`}>
                      {field.label}
                      {field.required && (
                        <span className="iw-required">제출 시 필수</span>
                      )}
                      {inquiryFieldType(field) === "select" ? (
                        <select
                          id={`iw-field-${field.id}`}
                          name={field.id}
                          aria-invalid={Boolean(fieldErrors[field.id])}
                          aria-describedby={
                            fieldErrors[field.id]
                              ? `iw-field-error-${field.id}`
                              : undefined
                          }
                          value={answers[field.id] || ""}
                          onChange={(event) =>
                            changeAnswer(field.id, event.target.value)
                          }
                        >
                          <option value="">선택해 주세요</option>
                          {field.options?.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      ) : inquiryFieldType(field) === "short_text" ? (
                        <input
                          id={`iw-field-${field.id}`}
                          name={field.id}
                          aria-invalid={Boolean(fieldErrors[field.id])}
                          aria-describedby={
                            fieldErrors[field.id]
                              ? `iw-field-error-${field.id}`
                              : undefined
                          }
                          type="text"
                          maxLength={12000}
                          placeholder={field.placeholder}
                          value={answers[field.id] || ""}
                          onChange={(event) =>
                            changeAnswer(field.id, event.target.value)
                          }
                        />
                      ) : (
                        <textarea
                          id={`iw-field-${field.id}`}
                          name={field.id}
                          aria-invalid={Boolean(fieldErrors[field.id])}
                          aria-describedby={
                            fieldErrors[field.id]
                              ? `iw-field-error-${field.id}`
                              : inquiryFieldType(field) === "url"
                                ? `iw-field-help-${field.id}`
                                : undefined
                          }
                          rows={field.id === "report" ? 7 : 4}
                          maxLength={12000}
                          placeholder={field.placeholder}
                          value={answers[field.id] || ""}
                          onChange={(event) =>
                            changeAnswer(field.id, event.target.value)
                          }
                        />
                      )}
                      {inquiryFieldType(field) === "url" && (
                        <small
                          className="iw-field-help"
                          id={`iw-field-help-${field.id}`}
                        >
                          http:// 또는 https://로 시작하는 주소를 한 줄에 하나씩
                          입력하세요. 아직 주소를 찾지 못했다면 임시저장을
                          이용하세요.
                        </small>
                      )}
                      {fieldErrors[field.id] && (
                        <span
                          className="iw-field-error"
                          id={`iw-field-error-${field.id}`}
                          role="alert"
                        >
                          {fieldErrors[field.id]}
                        </span>
                      )}
                    </label>
                  ) : (
                    <div className="iw-answer" key={field.id}>
                      <h3>{field.label}</h3>
                      <p>
                        {entry?.answers[field.id] ||
                          "아직 작성하지 않았습니다."}
                      </p>
                      <SourceLinks text={entry?.answers[field.id] || ""} />
                    </div>
                  ),
                )}
                {(entry?.fileName || editing) && (
                  <div className="iw-attachment">
                    <UploadCloud size={20} />
                    <div>
                      <b>단계별 첨부파일</b>
                      {entry?.fileName ? (
                        <a
                          href={`/api/inquiry/files?entryId=${encodeURIComponent(entry.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {entry.fileName}
                        </a>
                      ) : (
                        <p>
                          {entry
                            ? "20MB 이하 파일 1개를 첨부할 수 있습니다."
                            : "먼저 임시저장하면 파일을 첨부할 수 있습니다."}
                        </p>
                      )}
                      {editing && (
                        <>
                          <input
                            className="iw-file-input"
                            aria-label="이 단계에 첨부할 파일"
                            type="file"
                            ref={fileRef}
                            disabled={
                              !entry ||
                              entry.status === "approved" ||
                              modified ||
                              busy ||
                              uploading
                            }
                            onChange={(event) =>
                              void upload(event.target.files?.[0])
                            }
                          />
                          {modified && entry && (
                            <small>
                              작성 내용을 먼저 저장한 뒤 첨부해 주세요.
                            </small>
                          )}
                          {entry?.status === "approved" && (
                            <small>
                              확인 완료된 기록을 수정하려면 먼저 임시저장해
                              주세요.
                            </small>
                          )}
                          {uploading && (
                            <small role="status">
                              파일을 저장하고 있습니다…
                            </small>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {localError && (
                  <p
                    className="iw-alert iw-error"
                    role="alert"
                    ref={errorRef}
                    tabIndex={-1}
                  >
                    {localError}
                  </p>
                )}
                {editing && (
                  <>
                    <div className="iw-save-note">
                      <span>
                        {modified
                          ? "저장하지 않은 변경 내용이 있어요."
                          : entry
                            ? `${dateLabel(entry.updatedAt)} 저장됨`
                            : "한 문장만 작성해도 임시저장할 수 있어요."}
                      </span>
                      {entry?.status === "submitted" ||
                      entry?.status === "approved" ? (
                        <span>제출 후 수정한 내용은 다시 제출해 주세요.</span>
                      ) : null}
                    </div>
                    {!priorReady && (
                      <p className="iw-muted">
                        앞 단계가 제출되면 이 단계를 제출할 수 있습니다. 지금은
                        임시저장으로 준비해 보세요.
                      </p>
                    )}
                    <div className="iw-actions">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void save("draft")}
                      >
                        <Save />
                        임시저장
                      </Button>
                      <Button
                        type="submit"
                        disabled={!priorReady || entry?.status === "approved"}
                      >
                        {busy
                          ? "저장 중…"
                          : entry && entry.status !== "draft"
                            ? "수정 내용 제출"
                            : "이 단계 제출"}
                        <ArrowRight />
                      </Button>
                    </div>
                    {saveNotice && !modified && (
                      <div className="iw-save-result" role="status">
                        <p>{saveNotice}</p>
                        {entry?.status !== "draft" &&
                          stageId !== "reflection" && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                onNextStage(
                                  stageIds[stageIds.indexOf(stageId) + 1],
                                )
                              }
                            >
                              다음 단계:{" "}
                              {
                                inquiryStages[stageIds.indexOf(stageId) + 1]
                                  .short
                              }
                              <ArrowRight size={16} />
                            </Button>
                          )}
                      </div>
                    )}
                  </>
                )}
              </fieldset>
            </form>
          ) : (
            <div className="iw-empty-inline">
              {teacher
                ? "아직 이 단계의 기록이 없습니다."
                : "아직 제출된 기록이 없습니다."}
            </div>
          )}
        </section>
        <aside className="iw-side-stack">
          {priorId && (
            <div className="iw-reference-desktop">
              <InquiryReferencePanel
                board={board}
                team={team}
                stageId={stageId}
                ownerId={ownerId}
              />
            </div>
          )}
          <section className="iw-coaching">
            <span className="iw-eyebrow">
              <Lightbulb size={17} />
              다음 한 걸음
            </span>
            <h3>이렇게 이어가 보세요</h3>
            <ul>
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <p>
              작성 내용과 단계에 따른 안내입니다. 사실 여부를 자동 판정하지
              않습니다.
            </p>
          </section>
          <section className="iw-box iw-feedback">
            <div className="iw-section-heading">
              <h3>교사 피드백</h3>
              <MessageSquare size={18} />
            </div>
            {entry?.feedback.length ? (
              <div className="iw-feedback-history">
                {[...entry.feedback].reverse().map((item, index) => (
                  <article key={`${item.createdAt}-${index}`}>
                    <div>
                      <b>{item.authorName}</b>
                      <span className={`iw-status iw-status-${item.status}`}>
                        {entryStatusLabels[item.status]}
                      </span>
                    </div>
                    <p>{item.text}</p>
                    <small>
                      {dateLabel(item.createdAt)}
                      {index === 0 ? " · 최근 피드백" : ""}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="iw-muted">
                {teacher
                  ? "학생이 제출하면 잘한 점과 보완할 행동을 남겨 주세요."
                  : "제출 후 교사의 피드백이 이곳에 쌓입니다."}
              </p>
            )}
            {teacher &&
              entry &&
              entry.status !== "draft" &&
              !board.project.archived && (
                <form onSubmit={(event) => event.preventDefault()}>
                  <label>
                    피드백 작성
                    <textarea
                      rows={5}
                      maxLength={5000}
                      value={review}
                      placeholder="예: 비교한 자료의 차이를 잘 찾았어요. 다음에는 원문 발표 시기와 조사 조건을 함께 적어주세요."
                      onChange={(event) => {
                        setReview(event.target.value);
                        setReviewDirty(true);
                      }}
                    />
                  </label>
                  <div className="iw-feedback-actions">
                    {(["revision", "approved"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={status === "revision" ? "outline" : "default"}
                        type="button"
                        disabled={busy || uploading || !review.trim()}
                        onClick={async () => {
                          if (
                            await act(
                              {
                                action: "review",
                                projectId: board.project.id,
                                entryId: entry.id,
                                version: entry.version,
                                status,
                                text: review,
                              },
                              "교사 피드백을 남겼습니다.",
                            )
                          ) {
                            setReview("");
                            setReviewDirty(false);
                            onDirty(modified || commentDirty);
                          }
                        }}
                      >
                        {status === "revision" ? "보완 요청" : "확인 완료"}
                      </Button>
                    ))}
                  </div>
                </form>
              )}
          </section>
          {!teacher &&
            stageId === "reflection" &&
            entry &&
            entry.status !== "draft" && (
              <section className="iw-followup">
                <span className="iw-eyebrow">이번 탐구에서 다음 탐구로</span>
                <h3>나의 다음 질문을 이어가요</h3>
                <p>
                  {board.project.template === "fusion"
                    ? "내가 배운 점을 바탕으로 다음 탐구 질문을 정해보세요."
                    : entry.answers.next}
                </p>
                <Button variant="outline" onClick={startFollowup}>
                  개별 탐구 과제로 이어가기
                  <ArrowRight />
                </Button>
                <small>
                  {board.project.template === "fusion"
                    ? "제출한 탐구 성찰을 새 과제의 제안 배경으로 가져옵니다."
                    : "제출한 성찰의 다음 계획을 새 과제에 담아줍니다."}
                </small>
              </section>
            )}
        </aside>
      </div>
      {stageId !== "reflection" && (
        <Discussion
          board={board}
          team={team}
          profile={profile}
          teacher={teacher}
          busy={busy || uploading}
          act={act}
          onDirty={setCommentDirty}
          onError={onError}
        />
      )}
    </>
  );
}

function SourceLinks({ text }: { text: string }) {
  const links = [...new Set(text.match(/https?:\/\/[^\s<>"']+/g) || [])]
    .slice(0, 10)
    .map((url) => url.replace(/[),.。]+$/, ""));
  return links.length ? (
    <div className="iw-source-links">
      {links.map((url, index) => (
        <a
          key={`${url}-${index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          출처 {index + 1} 열기 ↗
        </a>
      ))}
    </div>
  ) : null;
}

function Discussion({
  board,
  team,
  profile,
  teacher,
  busy,
  act,
  onDirty,
  onError,
}: {
  board: InquiryBoard;
  team: InquiryTeam;
  profile: Profile;
  teacher: boolean;
  busy: boolean;
  act: Act;
  onDirty: (dirty: boolean) => void;
  onError: (error: string) => void;
}) {
  const [kind, setKind] = useState<InquiryComment["kind"]>("question");
  const [content, setContent] = useState("");
  const comments = board.comments.filter(
    (comment) => comment.teamId === team.id,
  );
  const canComment =
    !board.project.archived &&
    (teacher ||
      (profile.role !== "teacher" &&
        board.project.selectedIds.includes(profile.id)));
  return (
    <section className="iw-box iw-discussion">
      <div className="iw-section-heading">
        <div>
          <span className="iw-eyebrow">
            <MessageSquare size={16} />
            근거를 주고받는 대화
          </span>
          <h2>{team.name} 토론 공간</h2>
          <p>
            해당 프로젝트 참가 학생과 교사가 볼 수 있습니다. 다른 모둠을 선택해
            질문해 보세요.
          </p>
        </div>
        <span className="iw-pill">{comments.length}개 의견</span>
      </div>
      <div className="iw-comment-list">
        {comments.length ? (
          comments.map((comment) => (
            <article
              key={comment.id}
              className={comment.authorId === profile.id ? "iw-my-comment" : ""}
            >
              <div>
                <b>{comment.authorName}</b>
                <span className={`iw-comment-kind iw-comment-${comment.kind}`}>
                  {commentLabels[comment.kind]}
                </span>
                <small>{dateLabel(comment.createdAt)}</small>
              </div>
              <p>{comment.content}</p>
              <SourceLinks text={comment.content} />
            </article>
          ))
        ) : (
          <div className="iw-empty-inline">
            첫 질문을 남겨보세요. “이 근거가 다른 상황에서도 적용될까요?”처럼
            구체적으로 물어보면 좋아요.
          </div>
        )}
      </div>
      {canComment && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            onError("");
            const updated = await act(
              {
                action: "comment",
                projectId: board.project.id,
                teamId: team.id,
                kind,
                content,
              },
              "토론 의견을 등록했습니다.",
            );
            if (updated) {
              setContent("");
              onDirty(false);
            }
          }}
        >
          <div className="iw-comment-composer">
            <label>
              의견 종류
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as InquiryComment["kind"])
                }
              >
                {Object.entries(commentLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              토론 의견
              <textarea
                required
                rows={3}
                maxLength={5000}
                value={content}
                placeholder="질문할 대상을 밝히고, 반론이나 답변에는 근거를 함께 적어주세요."
                onChange={(event) => {
                  setContent(event.target.value);
                  onDirty(Boolean(event.target.value.trim()));
                }}
              />
            </label>
          </div>
          <div className="iw-actions">
            <p>
              서로의 생각을 정확히 이해하고, 사람보다 주장과 근거에 집중해요.
            </p>
            <Button type="submit" disabled={busy || !content.trim()}>
              <MessageSquare />
              의견 등록
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
