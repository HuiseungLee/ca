"use client";

import { Button } from "@/components/ui/button";
import {
  applicationApproved,
  isManagedFusion,
  isStageReleased,
  type InquiryBoard,
  type InquiryAction,
} from "@/lib/inquiry";

type Release = Extract<InquiryAction, { action: "release" }>;
export function InquiryDistributionPanel({
  board,
  teacher,
  teamId,
  busy,
  onRelease,
}: {
  board: InquiryBoard;
  teacher: boolean;
  teamId?: string;
  busy: boolean;
  onRelease: (action: Release) => void;
}) {
  if (board.project.template !== "fusion") return null;
  const managed = isManagedFusion(board.project);
  const applications =
    isStageReleased(board.project, "plan") &&
    isStageReleased(board.project, "materials");
  const outcomes =
    isStageReleased(board.project, "report") &&
    isStageReleased(board.project, "reflection");
  const approved = applicationApproved(board.entries, teamId);
  const approvedCount = board.teams.filter((team) =>
    applicationApproved(board.entries, team.id),
  ).length;
  function release(phase: Release["phase"], released: boolean) {
    if (
      !managed &&
      !window.confirm(
        "단계별 배부 관리를 시작하면 보고서·성찰 작성 전에 신청서와 물품 신청서의 교사 확인이 필요합니다. 기존 기록은 유지됩니다. 적용할까요?",
      )
    )
      return;
    if (
      !released &&
      !window.confirm(
        "양식을 회수하면 학생의 작성·수정이 잠깁니다. 저장된 답변은 유지되며 조회·다운로드할 수 있습니다. 회수할까요?",
      )
    )
      return;
    onRelease({
      action: "release",
      projectId: board.project.id,
      phase,
      released,
    });
  }
  return (
    <section className="iw-distribution" aria-label="융합탐구 배부와 진행 관리">
      <div className="iw-section-heading">
        <div>
          <h2>{teacher ? "배부와 진행 관리" : "우리 모둠의 활동 순서"}</h2>
          <p>
            {teacher
              ? "신청서 확인 후 활동을 진행하고, 활동이 끝나면 결과 양식을 별도로 배부하세요."
              : "신청 → 교사 확인 → 실제 활동 → 보고서·개인 성찰 순서로 진행해요."}
          </p>
        </div>
      </div>
      {!managed && (
        <p className="iw-muted">
          기존 프로젝트: 모든 양식이 열려 있습니다. 배부 관리 버튼을 사용하면
          교사 확인 절차가 적용됩니다.
        </p>
      )}
      <div className="iw-distribution-grid">
        <article>
          <span className="iw-eyebrow">01 · 활동 전</span>
          <h3>신청서 · 물품 신청서</h3>
          <p>
            모둠장이 공동 기록을 작성·제출합니다. 교사는 두 양식에 각각 ‘확인
            완료’ 또는 ‘보완 요청’을 남겨 주세요.
          </p>
          <b>{applications ? "작성 가능 · 배부 중" : "아직 배부하지 않음"}</b>
          {teacher && (
            <Button
              type="button"
              variant={applications ? "outline" : "default"}
              disabled={busy || board.project.archived}
              onClick={() => release("applications", !applications)}
            >
              {applications ? "신청 양식 회수" : "신청서·물품 신청서 배부"}
            </Button>
          )}
        </article>
        <article>
          <span className="iw-eyebrow">02 · 신청 확인 · 실제 활동</span>
          <h3>교사 확인 후 활동하기</h3>
          <p>
            {teacher
              ? "진행 현황에서 모둠의 신청서와 예산을 검토하세요. 확인 완료된 모둠은 실제 탐구활동을 진행합니다."
              : approved
                ? "신청서와 물품 신청서 확인이 완료됐어요. 계획에 따라 활동하고 자료를 모아 두세요."
                : "신청서와 물품 신청서를 제출하고 교사의 확인을 기다려 주세요."}
          </p>
          <b>
            {teacher
              ? `${approvedCount} / ${board.teams.length}개 모둠 확인 완료`
              : approved
                ? "활동 진행"
                : "교사 확인 대기"}
          </b>
        </article>
        <article>
          <span className="iw-eyebrow">03 · 활동 후</span>
          <h3>심화 보고서 · 성찰 일지</h3>
          <p>
            심화 보고서는 모둠장, 성찰 일지는 모둠장 포함 전원이 각자
            제출합니다.
          </p>
          <b>
            {!outcomes
              ? "활동 후 배부 예정"
              : managed && !teacher && !approved
                ? "배부됨 · 신청서 확인 후 작성 가능"
                : "작성 가능 · 배부 중"}
          </b>
          {teacher && (
            <Button
              type="button"
              variant={outcomes ? "outline" : "default"}
              disabled={busy || board.project.archived}
              onClick={() => release("outcomes", !outcomes)}
            >
              {outcomes ? "결과 양식 회수" : "보고서·성찰 일지 배부"}
            </Button>
          )}
        </article>
      </div>
      <p className="iw-muted">
        배부와 문항 편집은 별개입니다. 회수해도 저장된 답변과 첨부파일은
        삭제되지 않습니다.
      </p>
    </section>
  );
}
