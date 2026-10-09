import { materialAnswerError } from "@/lib/inquiry-materials";

/** Shared workflow definitions. Completion records participation, not academic ability. */
export const stageIds = [
  "sources",
  "evidence",
  "verdict",
  "discussion",
  "output",
  "reflection",
] as const;
export const allStageIds = [
  ...stageIds,
  "plan",
  "materials",
  "report",
] as const;
export type StageId = (typeof allStageIds)[number];
export type InquiryTemplate = "factcheck" | "fusion";
export type StageSettings = {
  id: StageId;
  instruction: string;
  dueDate: string;
  fields?: InquiryField[];
  revision?: number;
  publishedAt?: string;
};
export type InquiryField = {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  type?: "short_text" | "long_text" | "select" | "url" | "materials";
  options?: string[];
};
export const inquiryStages: {
  id: StageId;
  title: string;
  short: string;
  description: string;
  fields: InquiryField[];
}[] = [
  {
    id: "sources",
    title: "미디어 주장 수집",
    short: "주장 수집",
    description: "기사·영상에서 함께 확인할 주장 하나를 골라보세요.",
    fields: [
      {
        id: "claim",
        label: "검증할 주장",
        placeholder:
          "누가, 무엇이, 어떻다고 주장하나요? 한두 문장으로 적어주세요.",
        required: true,
      },
      {
        id: "links",
        label: "기사·영상 출처 링크",
        placeholder:
          "https:// 로 시작하는 원문 링크를 한 줄에 하나씩 붙여주세요.",
        required: true,
      },
      {
        id: "context",
        label: "제작자·발표 시기·목적",
        placeholder:
          "누가 언제 만들었나요? 알리기, 설득하기, 판매하기 중 어떤 목적이 보이나요?",
        required: true,
      },
    ],
  },
  {
    id: "evidence",
    title: "과학적 검증",
    short: "근거 검증",
    description:
      "주장과 근거를 나누고, 확인한 것과 아직 모르는 것을 구분해보세요.",
    fields: [
      {
        id: "evidence",
        label: "확인한 근거와 출처",
        placeholder:
          "원문 자료의 링크·제목·발행기관과, 주장을 뒷받침하거나 반박하는 내용을 적어주세요.",
        required: true,
      },
      {
        id: "perspectives",
        label: "분야별 관점",
        placeholder:
          "물리·생명과학·화학 중 관련된 관점을 적용하세요. 주제에 따라 환경·사회·경제·언어 등으로 넓혀도 좋아요.",
        required: true,
      },
      {
        id: "limits",
        label: "근거의 한계와 추가 확인",
        placeholder:
          "실험 조건, 표본, 발표 시기, 반대 근거 등 더 확인할 것은 무엇인가요?",
        required: true,
      },
    ],
  },
  {
    id: "verdict",
    title: "사실 판단",
    short: "사실 판단",
    description:
      "근거의 범위 안에서 판단하고, 확실하지 않은 부분도 남겨주세요.",
    fields: [
      {
        id: "verdict",
        label: "우리 모둠의 판단",
        placeholder: "판단을 선택하세요.",
        required: true,
        options: [
          "사실",
          "대체로 사실",
          "일부 사실",
          "과장",
          "근거 부족",
          "판단 보류",
        ],
      },
      {
        id: "reason",
        label: "판단 이유와 연결 근거",
        placeholder:
          "어떤 근거 때문에 이렇게 판단했나요? 주장 중 어느 부분까지 확인했나요?",
        required: true,
      },
      {
        id: "uncertainty",
        label: "판단이 달라질 수 있는 조건",
        placeholder: "어떤 새로운 자료가 나오면 판단을 바꾸겠나요?",
        required: true,
      },
    ],
  },
  {
    id: "discussion",
    title: "모둠 토론",
    short: "토론",
    description:
      "아래 토론 공간에서 질문·반론·추가 근거를 나누고 생각의 변화를 정리하세요.",
    fields: [
      {
        id: "question",
        label: "함께 논의할 질문",
        placeholder:
          "근거가 엇갈리거나 사회적 합의가 필요한 질문은 무엇인가요?",
        required: true,
      },
      {
        id: "response",
        label: "받은 질문·반론과 우리의 답변",
        placeholder: "다른 의견을 정확히 요약한 뒤, 근거를 붙여 답해보세요.",
        required: true,
      },
      {
        id: "change",
        label: "토론 뒤 보완한 생각",
        placeholder: "유지한 입장, 바뀐 입장, 아직 남은 쟁점을 적어주세요.",
        required: true,
      },
    ],
  },
  {
    id: "output",
    title: "결과물 제출",
    short: "결과물",
    description: "탐구 과정을 다른 사람이 이해할 수 있는 결과물로 완성하세요.",
    fields: [
      {
        id: "report",
        label: "팩트체크 보고서",
        placeholder:
          "주장 → 주요 근거 → 판단 → 한계 순서로 작성하거나 결과물 링크와 요약을 남겨주세요.",
        required: true,
      },
      {
        id: "content",
        label: "디지털 콘텐츠",
        placeholder:
          "카드뉴스·인포그래픽·영상 등의 링크와 핵심 메시지. 파일은 아래에서 첨부할 수 있어요.",
        required: true,
      },
      {
        id: "proposal",
        label: "시민 제안서",
        placeholder:
          "누가 무엇을 바꾸면 좋을까요? 실천 방법, 이유, 적용 조건을 적어주세요.",
        required: true,
      },
    ],
  },
  {
    id: "reflection",
    title: "개인 성찰",
    short: "개인 성찰",
    description:
      "모둠의 결과와 나의 기여를 구분하고, 다음 탐구 방향을 찾아보세요. 본인과 교사만 볼 수 있어요.",
    fields: [
      {
        id: "contribution",
        label: "내가 맡은 역할과 기여",
        placeholder: "직접 조사·검증·제작·조율한 일과 그 근거를 적어주세요.",
        required: true,
      },
      {
        id: "change",
        label: "나의 관점 변화",
        placeholder:
          "처음 생각과 지금 생각은 어떻게 다른가요? 영향을 준 근거나 의견은 무엇인가요?",
        required: true,
      },
      {
        id: "career",
        label: "진로와 연결되는 배움",
        placeholder:
          "관심 분야에서 이번 탐구의 어떤 방법이나 개념을 활용할 수 있을까요?",
        required: true,
      },
      {
        id: "next",
        label: "다음 탐구 계획",
        placeholder:
          "이어갈 질문 하나와, 다음에 바로 할 수 있는 작은 행동을 적어주세요.",
        required: true,
      },
    ],
  },
];
/** School worksheets: two planning forms, a group report, and private individual reflections. */
export const fusionInquiryStages: typeof inquiryStages = [
  {
    id: "plan",
    title: "융합탐구 프로젝트 활동 계획서",
    short: "활동 계획서",
    description:
      "활동 전, 모둠원이 함께 계획을 세우고 모둠장이 대표로 제출하세요. 진로·교과·관심 키워드를 탐구 주제와 방법으로 연결해 보세요.",
    fields: [
      {
        id: "school_year",
        label: "학년도",
        placeholder: "예: 2026학년도",
        required: true,
        type: "short_text",
      },
      {
        id: "team_name",
        label: "팀명",
        placeholder: "모둠의 이름을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "leader_number",
        label: "팀장 학번",
        placeholder: "모둠장의 학번을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "leader_name",
        label: "팀장 이름",
        placeholder: "모둠장의 이름을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "contact",
        label: "연락처 (선택)",
        placeholder:
          "학교에서 필요한 경우에만 입력하세요. 모둠원과 교사에게만 공개됩니다.",
        required: false,
        type: "short_text",
      },
      {
        id: "members",
        label: "팀원 학번·이름",
        placeholder: "팀원 모두의 학번과 이름을 한 줄에 한 명씩 적어주세요.",
        required: true,
      },
      {
        id: "career",
        label: "진로 희망분야",
        placeholder: "팀원들의 공통된 진로 희망 분야를 설정하세요.",
        required: true,
      },
      {
        id: "keywords",
        label: "관심 키워드",
        placeholder: "진로 희망 분야에 대한 관심 키워드를 적어주세요.",
        required: true,
      },
      {
        id: "subjects",
        label: "관련 교과목",
        placeholder: "자신의 주제와 긴밀하게 연결될 교과목을 적어주세요.",
        required: true,
      },
      {
        id: "subject_link",
        label: "관심 키워드와 관련 교과목의 선정 이유",
        placeholder:
          "교과에서 궁금했던 개념이나 주제, 활동을 하며 더 알고 싶어진 내용을 떠올려 보세요. 관심 키워드와 교과목을 왜 연결했는지, 탐구에서 어떻게 활용할지 구체적으로 설명하세요.",
        required: true,
      },
      {
        id: "topic",
        label: "탐구 주제",
        placeholder: "우리 모둠이 함께 탐구할 주제를 적어주세요.",
        required: true,
      },
      {
        id: "method",
        label: "탐구 방법",
        placeholder:
          "K-MOOC·도서·논문 등 자료 조사, 실험·관찰·설문·인터뷰 등 주제에 맞는 방법을 정하세요. 역할 분담과 진행 순서, 자료를 수집·분석할 방법을 적어주세요.",
        required: true,
      },
      {
        id: "expected_effect",
        label: "기대 효과",
        placeholder:
          "어떤 탐구 결과를 기대하나요? 탐구를 통해 무엇을 배우고 어떤 도움을 줄 수 있을지 적어주세요.",
        required: true,
      },
      {
        id: "written_date",
        label: "작성일",
        placeholder: "예: 2026-10-08",
        required: true,
        type: "short_text",
      },
      {
        id: "signature",
        label: "대표 확인 (이름)",
        placeholder:
          "모둠원과 계획을 확인한 뒤 대표 이름을 입력하세요. 공인 전자서명은 아닙니다.",
        required: true,
        type: "short_text",
      },
    ],
  },
  {
    id: "materials",
    title: "융합탐구 프로젝트 물품 신청서",
    short: "물품 신청서",
    description:
      "활동 전, 모둠장이 필요한 물품을 정리해 제출하세요. 수량 × 단가 + 배송비의 합계는 20만 원 이내입니다. 제출은 신청 기록이며 구매나 예산 승인을 뜻하지 않습니다.",
    fields: [
      {
        id: "team_name",
        label: "팀명",
        placeholder: "모둠의 이름을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "items",
        label: "융합탐구 물품 정보 (20만 원 이내)",
        placeholder:
          "물품명·모델명, 규격, S2B 물품번호, 수량, 단가, 배송비를 입력하세요. 필요한 물품이 없으면 ‘신청 물품 없음’을 선택하세요.",
        required: true,
        type: "materials",
      },
      {
        id: "request_note",
        label: "신청 사유·추가 전달 사항 (선택)",
        placeholder:
          "탐구에서 물품을 어떻게 사용할지, 공동 배송 등 확인할 내용을 적어주세요.",
        required: false,
      },
      {
        id: "written_date",
        label: "작성일",
        placeholder: "예: 2026-10-08",
        required: true,
        type: "short_text",
      },
      {
        id: "signature",
        label: "대표 확인 (이름)",
        placeholder:
          "물품과 예상 금액을 확인한 뒤 대표 이름을 입력하세요. 공인 전자서명은 아닙니다.",
        required: true,
        type: "short_text",
      },
    ],
  },
  {
    id: "report",
    title: "융합탐구 프로젝트 탐구확장 심화 보고서",
    short: "심화 보고서",
    description:
      "활동 후, 모둠장이 모둠의 과정과 결과를 모아 제출하세요. 앞서 작성한 계획서·물품 신청서를 참고하고 결과를 보여주는 자료를 첨부할 수 있습니다.",
    fields: [
      {
        id: "team_name",
        label: "팀명",
        placeholder: "모둠의 이름을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "topic",
        label: "주제",
        placeholder: "우리 모둠이 탐구한 주제를 적어주세요.",
        required: true,
      },
      {
        id: "process",
        label: "탐구 과정 요약",
        placeholder:
          "탐구를 위해 어느 날 무엇을 했는지, 과정을 시간순으로 요약해 적어주세요.",
        required: true,
      },
      {
        id: "results",
        label: "탐구 결과",
        placeholder:
          "자료와 관찰·실험 등의 근거를 바탕으로 탐구 결론을 구체적으로 적어주세요. 확인하지 못한 한계도 함께 남겨주세요.",
        required: true,
      },
      {
        id: "subject_link",
        label: "교과 내용과의 관련성",
        placeholder:
          "어떤 교과 지식이 탐구에 연결되었나요? 교과의 개념·원리·방법을 어떻게 적용했는지 구체적인 사례와 함께 설명하세요.",
        required: true,
      },
      {
        id: "effort",
        label: "흥미로웠던 점",
        placeholder:
          "탐구 과정에서 특히 흥미로웠던 장면이나 결과를 구체적으로 적어주세요.",
        required: true,
      },
      {
        id: "learned",
        label: "새롭게 알게 된 점",
        placeholder:
          "탐구 전에는 몰랐지만 이번 활동으로 새롭게 알게 된 내용을 구체적으로 적어주세요.",
        required: true,
      },
      {
        id: "contribution",
        label: "탐구 내용의 실생활 적용 및 사회적 기여 방안",
        placeholder:
          "이번 탐구를 실생활에 어떻게 적용할 수 있나요? 어떤 사람이나 사회 문제에 도움을 줄 수 있는지, 적용 조건과 함께 제안하세요.",
        required: true,
      },
      {
        id: "next",
        label: "추후 탐구 제안",
        placeholder:
          "결과를 요약하는 데서 나아가 우리 모둠의 생각과 의문을 남겨주세요. 아직 해결하지 못한 질문은 무엇이며, 다음 활동에서 어떤 방법으로 더 탐구할 수 있을까요?",
        required: true,
      },
      {
        id: "written_date",
        label: "작성일",
        placeholder: "예: 2026-10-08",
        required: true,
        type: "short_text",
      },
      {
        id: "signature",
        label: "대표 확인 (이름)",
        placeholder:
          "모둠원과 결과를 확인한 뒤 대표 이름을 입력하세요. 공인 전자서명은 아닙니다.",
        required: true,
        type: "short_text",
      },
    ],
  },
  {
    id: "reflection",
    title: "융합탐구 프로젝트 성찰 일지",
    short: "개인 성찰 일지",
    description:
      "활동 후, 모둠장 포함 모든 모둠원이 각자 작성·제출하세요. 개인의 참여와 성장을 돌아보는 기록이며 본인과 교사만 볼 수 있습니다.",
    fields: [
      {
        id: "team_name",
        label: "팀명",
        placeholder: "모둠의 이름을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "student_number",
        label: "탐구자 학번",
        placeholder: "본인의 학번을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "student_name",
        label: "탐구자 성명",
        placeholder: "본인의 이름을 적어주세요.",
        required: true,
        type: "short_text",
      },
      {
        id: "motivation",
        label: "탐구 참여 동기",
        placeholder: "이 탐구에 참여하게 된 동기를 구체적으로 적어주세요.",
        required: true,
      },
      {
        id: "role",
        label: "탐구 과정 역할",
        placeholder:
          "탐구를 수행하는 과정에서 자신이 맡은 역할과 실제로 한 일을 구체적으로 적어주세요.",
        required: true,
      },
      {
        id: "learned",
        label: "새롭게 알게 된 점",
        placeholder: "탐구 내용과 관련하여 새롭게 알게 된 점을 적어주세요.",
        required: true,
      },
      {
        id: "regret",
        label: "아쉬운 점",
        placeholder:
          "탐구 내용이나 진행 과정에서 아쉬웠던 점과 보완 방법을 적어주세요.",
        required: true,
      },
      {
        id: "reflection",
        label: "탐구 성찰",
        placeholder:
          "탐구 과정에서 느낀 점과 앞으로의 탐구 활동 계획을 적어주세요. 자신의 관심 진로와 연결되는 배움도 함께 돌아보세요.",
        required: true,
      },
      {
        id: "written_date",
        label: "작성일",
        placeholder: "예: 2026-10-08",
        required: true,
        type: "short_text",
      },
      {
        id: "signature",
        label: "본인 확인 (이름)",
        placeholder:
          "본인이 직접 작성한 내용을 확인하고 이름을 입력하세요. 공인 전자서명은 아닙니다.",
        required: true,
        type: "short_text",
      },
    ],
  },
];

export function getProjectStages(project: Pick<InquiryProject, "template">) {
  return project.template === "fusion" ? fusionInquiryStages : inquiryStages;
}

export function templateForStages(
  stages: readonly Pick<StageSettings, "id">[],
): InquiryTemplate {
  return stages.some((stage) => stage.id === "plan") ? "fusion" : "factcheck";
}

export const defaultStageSettings = (
  template: InquiryTemplate = "factcheck",
): StageSettings[] =>
  getProjectStages({ template }).map((s) => ({
    id: s.id,
    instruction: s.description,
    dueDate: "",
    ...(template === "fusion"
      ? { fields: s.fields.map((field) => ({ ...field })) }
      : {}),
  }));
export type EntryStatus = "draft" | "submitted" | "revision" | "approved";
export const entryStatusLabels: Record<EntryStatus, string> = {
  draft: "작성 중",
  submitted: "피드백 대기",
  revision: "보완 요청",
  approved: "확인 완료",
};
export type InquiryProject = {
  id: string;
  title: string;
  description: string;
  status: string;
  applicantIds: string[];
  selectedIds: string[];
  stages: StageSettings[];
  archived: boolean;
  template?: InquiryTemplate;
};
export type InquiryTeam = {
  id: string;
  projectId: string;
  name: string;
  memberIds: string[];
  representativeId: string;
};
export type InquiryFeedback = {
  text: string;
  authorName: string;
  createdAt: string;
  status: "revision" | "approved";
};
export type InquiryEntry = {
  id: string;
  projectId: string;
  teamId: string | null;
  ownerId: string | null;
  stageId: StageId;
  answers: Record<string, string>;
  fieldSnapshot?: InquiryField[];
  formRevision?: number;
  instructionSnapshot?: string;
  status: EntryStatus;
  version: number;
  feedback: InquiryFeedback[];
  fileName: string | null;
  updatedAt: string;
};
export type InquiryComment = {
  id: string;
  projectId: string;
  teamId: string;
  authorId: string;
  authorName: string;
  kind: "question" | "counter" | "evidence" | "reply";
  content: string;
  createdAt: string;
};
export type InquiryPerson = { id: string; displayName: string; career: string };
export type InquiryBoard = {
  project: InquiryProject;
  teams: InquiryTeam[];
  entries: InquiryEntry[];
  comments: InquiryComment[];
  people: InquiryPerson[];
};
export type InquiryAction =
  | {
      action: "create";
      title: string;
      description: string;
      projectId?: string;
      template?: InquiryTemplate;
    }
  | {
      action: "publish_form";
      projectId: string;
      stageId: StageId;
      fields: InquiryField[];
      revision: number;
    }
  | {
      action: "update";
      projectId: string;
      title: string;
      description: string;
      stages: StageSettings[];
      archived: boolean;
      status: "open" | "closed";
    }
  | { action: "apply"; projectId: string }
  | { action: "select"; projectId: string; selectedIds: string[] }
  | {
      action: "team";
      projectId: string;
      id?: string;
      name: string;
      memberIds: string[];
      representativeId: string;
    }
  | {
      action: "save";
      projectId: string;
      teamId?: string;
      stageId: StageId;
      answers: Record<string, string>;
      status: "draft" | "submitted";
      version: number;
      formRevision?: number;
    }
  | {
      action: "review";
      projectId: string;
      entryId: string;
      version: number;
      status: "revision" | "approved";
      text: string;
    }
  | {
      action: "comment";
      projectId: string;
      teamId: string;
      kind: InquiryComment["kind"];
      content: string;
    };

export function stageEntry(
  entries: InquiryEntry[],
  stageId: StageId,
  teamId?: string,
  ownerId?: string,
) {
  return entries.find(
    (e) =>
      e.stageId === stageId &&
      (stageId === "reflection" ? e.ownerId === ownerId : e.teamId === teamId),
  );
}
export function nextStage(
  entries: InquiryEntry[],
  teamId?: string,
  ownerId?: string,
  ids: readonly StageId[] = stageIds,
): StageId {
  return (
    ids.find((id) => {
      const entry = stageEntry(entries, id, teamId, ownerId);
      return !entry || entry.status === "draft" || entry.status === "revision";
    }) ?? "reflection"
  );
}
export function stageCoaching(
  stageId: StageId,
  answers: Record<string, string>,
  feedback?: InquiryFeedback,
  career?: string,
  fields?: InquiryField[],
  template: InquiryTemplate = "factcheck",
): string[] {
  const stage =
    getProjectStages({ template }).find((s) => s.id === stageId) ??
    fusionInquiryStages.find((s) => s.id === stageId)!;
  const missing = (fields ?? stage.fields).filter(
    (f) => f.required && !answers[f.id]?.trim(),
  );
  const tips: string[] = [];
  if (feedback?.status === "revision")
    tips.push(`교사 피드백부터 반영해보세요: ${feedback.text}`);
  if (missing.length)
    tips.push(
      `먼저 ‘${missing[0].label}’에 한두 문장을 적어보세요. 임시저장 후 이어 쓸 수 있어요.`,
    );
  if (stageId === "sources")
    tips.push(
      "원문 링크를 열어 제작자와 날짜를 확인하고, 의견과 검증할 수 있는 주장을 구분하세요.",
    );
  if (stageId === "evidence")
    tips.push(
      "서로 독립된 출처를 비교하세요. 같은 보도자료를 인용한 두 기사는 독립된 근거가 아닐 수 있어요.",
    );
  if (stageId === "verdict")
    tips.push(
      "앞 단계의 근거를 인용하고, 확인하지 못한 부분은 ‘근거 부족’이나 ‘판단 보류’로 남겨도 좋아요.",
    );
  if (stageId === "discussion")
    tips.push(
      "다른 모둠에 질문 하나를 남기고, 우리 모둠이 받은 질문에 근거를 붙여 답해보세요.",
    );
  if (stageId === "output")
    tips.push(
      "결론뿐 아니라 출처와 한계도 보여주세요. 콘텐츠를 처음 보는 사람도 원문 근거를 찾을 수 있나요?",
    );
  if (stageId === "plan")
    tips.push(
      "관심 키워드와 교과 개념을 연결해 질문 하나를 정하고, 역할과 탐구 방법을 모둠원과 나누어 확인하세요.",
    );
  if (stageId === "materials")
    tips.push(
      "계획서의 탐구 방법에 실제로 필요한 물품인지 확인하고, 배송비를 포함한 합계가 20만 원 이내인지 점검하세요. 물품이 없으면 ‘신청 물품 없음’을 선택하세요.",
    );
  if (stageId === "report")
    tips.push(
      "계획서와 실제 활동을 비교하며 바뀐 점을 적어보세요. 결론의 근거와 한계, 실생활 적용 방법, 다음 질문까지 연결하면 좋아요.",
    );
  if (stageId === "reflection")
    tips.push(
      template === "fusion"
        ? `모둠의 결과를 그대로 옮기기보다 자신이 실제로 한 일과 배운 점을 적어보세요. ${career || "관심 진로"}와 연결되는 배움, 아쉬웠던 점, 다음 탐구 계획을 돌아보세요.`
        : `${career || "관심 진로"}에서 활용할 수 있는 탐구 방법 하나를 고르고, 이번 활동에서 직접 한 일을 예로 연결해보세요.`,
    );
  return tips;
}

export function inquiryFieldType(
  field: InquiryField,
): NonNullable<InquiryField["type"]> {
  return (
    field.type ??
    (field.options?.length
      ? "select"
      : field.id === "links"
        ? "url"
        : "long_text")
  );
}

/** Shared submission checks; drafts intentionally allow incomplete answers. */
export function inquiryAnswerErrors(
  fields: InquiryField[],
  answers: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = answers[field.id]?.trim() || "";
    if (!value) {
      if (field.required)
        errors[field.id] =
          "필수 문항입니다. 내용을 입력해 주세요. 아직 작성 중이라면 임시저장할 수 있습니다.";
      continue;
    }
    if (
      inquiryFieldType(field) === "select" &&
      !field.options?.includes(value)
    ) {
      errors[field.id] = "제시된 선택지 중 하나를 선택해 주세요.";
    }
    if (inquiryFieldType(field) === "materials") {
      const error = materialAnswerError(value);
      if (error) errors[field.id] = error;
    }
    if (inquiryFieldType(field) === "url") {
      const links = value
        .split(/\r?\n/)
        .map((link) => link.trim())
        .filter(Boolean);
      if (links.length > 20)
        errors[field.id] = "링크는 한 문항에 최대 20개까지 입력할 수 있습니다.";
      else if (
        links.some((link) => {
          try {
            return !["http:", "https:"].includes(new URL(link).protocol);
          } catch {
            return true;
          }
        })
      ) {
        errors[field.id] =
          "주소가 아닌 내용이 포함되어 있습니다. http:// 또는 https://로 시작하는 실제 기사·영상 주소를 한 줄에 하나씩 입력해 주세요.";
      }
    }
  }
  return errors;
}

export function publishedStageFields(
  stageId: StageId,
  setting?: StageSettings,
): InquiryField[] {
  return (
    setting?.fields ??
    [...inquiryStages, ...fusionInquiryStages].find(
      (stage) => stage.id === stageId,
    )!.fields
  );
}

/** Started records retain their original questions, including pre-editor legacy records. */
export function entryStageFields(
  stageId: StageId,
  setting?: StageSettings,
  entry?: Pick<InquiryEntry, "fieldSnapshot">,
): InquiryField[] {
  if (!entry) return publishedStageFields(stageId, setting);
  return entry.fieldSnapshot?.length
    ? entry.fieldSnapshot
    : [...inquiryStages, ...fusionInquiryStages].find(
        (stage) => stage.id === stageId,
      )!.fields;
}
