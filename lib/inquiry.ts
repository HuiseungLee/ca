/** Shared workflow definitions. Completion records participation, not academic ability. */
export const stageIds = [
  "sources",
  "evidence",
  "verdict",
  "discussion",
  "output",
  "reflection",
] as const;
export type StageId = (typeof stageIds)[number];
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
  type?: "short_text" | "long_text" | "select" | "url";
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
export const defaultStageSettings = (): StageSettings[] =>
  inquiryStages.map((s) => ({
    id: s.id,
    instruction: s.description,
    dueDate: "",
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
  | { action: "create"; title: string; description: string; projectId?: string }
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
): StageId {
  return (
    stageIds.find((id) => {
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
): string[] {
  const stage = inquiryStages.find((s) => s.id === stageId)!;
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
  if (stageId === "reflection")
    tips.push(
      `${career || "관심 진로"}에서 활용할 수 있는 탐구 방법 하나를 고르고, 이번 활동에서 직접 한 일을 예로 연결해보세요.`,
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
    inquiryStages.find((stage) => stage.id === stageId)!.fields
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
    : inquiryStages.find((stage) => stage.id === stageId)!.fields;
}
