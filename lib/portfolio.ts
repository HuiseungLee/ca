import { findFamily } from "./analyze-activity";

export type PortfolioActivity = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  summary?: string;
  keywords: string[];
  parentActivityIds?: string[];
  teacherFeedback?: string;
  fitScore: number;
};
export type ActivityEdge = {
  source: string;
  target: string;
  kind: "explicit" | "suggested";
  reason: string;
};
export type InquirySuggestion = {
  id: string;
  title: string;
  question: string;
  reason: string;
  method: string;
  output: string;
  parentActivityIds: string[];
};
const normalized = (value: string) => value.toLowerCase().replace(/\s+/g, "");

export function buildPortfolio(career: string, input: PortfolioActivity[]) {
  const records = [...input].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const family = findFamily(career);
  const concepts = family?.[1].concepts ?? [];
  const tags = new Map(
    records.map((record) => {
      const text = normalized(`${record.title} ${record.summary ?? ""}`);
      return [
        record.id,
        [
          ...new Set(
            concepts.filter((concept) => text.includes(normalized(concept))),
          ),
        ],
      ];
    }),
  );
  const edges: ActivityEdge[] = [];
  const recordIds = new Set(records.map((record) => record.id));
  for (const current of records)
    for (const parentId of new Set(current.parentActivityIds ?? [])) {
      if (parentId !== current.id && recordIds.has(parentId))
        edges.push({
          source: parentId,
          target: current.id,
          kind: "explicit",
          reason: "작성자가 앞선 활동에서 이어진 탐구로 직접 연결했습니다.",
        });
    }
  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    for (const previous of records.slice(0, i)) {
      if (
        !edges.some(
          (edge) =>
            edge.kind === "explicit" &&
            ((edge.source === previous.id && edge.target === current.id) ||
              (edge.source === current.id && edge.target === previous.id)),
        )
      ) {
        const shared = (tags.get(current.id) ?? []).filter((tag) =>
          tags.get(previous.id)?.includes(tag),
        );
        if (shared.length >= 2)
          edges.push({
            source: previous.id,
            target: current.id,
            kind: "suggested",
            reason: `공통 개념: ${shared.slice(0, 4).join(" · ")}. 단어 기반 추정이므로 실제 탐구의 연속성을 확인해 주세요.`,
          });
      }
    }
  }
  const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const isolated = records.filter((record) => !linked.has(record.id));
  const covered = concepts.filter((concept) =>
    records.some((record) =>
      normalized(`${record.title} ${record.summary ?? ""}`).includes(
        normalized(concept),
      ),
    ),
  );
  const missing = concepts.filter((concept) => !covered.includes(concept));
  const latest = records.at(-1);
  const focus =
    (latest ? tags.get(latest.id)?.[0] : undefined) ??
    covered[0] ??
    missing[0] ??
    (career === "진로 탐색 중" ? "관심 분야" : career);
  const anchor = latest ? `‘${latest.title}’` : `${career}에 대한 관심`;
  const hasEvidence = records.some((record) =>
    /측정|수치|통계|출처|변인|인터뷰/.test(record.summary ?? ""),
  );
  const suggestions: InquirySuggestion[] = [
    {
      id: "deepen",
      title: `${focus}: 질문을 비교 탐구로 확장`,
      question: `${focus}에 영향을 주는 조건을 바꾸면 결과가 어떻게 달라질까요?`,
      reason: latest
        ? `${anchor}의 질문을 직접 확인하는 후속 활동입니다. ${hasEvidence ? "기존 근거의 한계를 검증해 보세요." : "현재 기록에서 측정·출처 등 근거 표현이 부족해 이를 보완합니다."}`
        : "첫 기록을 만들기 위해 관심을 관찰 가능한 질문으로 바꿉니다.",
      method:
        family?.[1].extensions[0] ??
        "비교할 두 사례를 정하고 같은 기준으로 자료를 모으세요. 출처와 관찰 결과를 표로 정리하세요.",
      output: "탐구 질문 1개, 비교표, 자료 출처, 결론과 한계",
      parentActivityIds: latest ? [latest.id] : [],
    },
    {
      id: "broaden",
      title: `${missing[0] ?? focus} 관점 더하기`,
      question: `${anchor}에 ${missing[0] ?? "다른 이해관계자"} 관점을 더하면 어떤 새로운 문제가 보일까요?`,
      reason: missing.length
        ? `현재 기록에서 ‘${missing[0]}’ 개념이 확인되지 않아 진로 관점을 넓히는 제안입니다. 모든 개념을 다룰 필요는 없습니다.`
        : "한 가지 주제를 다른 관점으로 해석하며 탐구의 폭을 넓힙니다.",
      method:
        "공신력 있는 자료 두 개를 비교하고 서로 다른 설명을 찾아보세요. 기존 탐구의 결론을 바꿀 수 있는 근거 하나를 제시하세요.",
      output: "자료 비교 기록, 새롭게 발견한 관점, 후속 질문",
      parentActivityIds: latest ? [latest.id] : [],
    },
    {
      id: "connect",
      title:
        records.length > 1 ? "활동 사이의 연결 설명하기" : "작은 실행과 피드백",
      question:
        records.length > 1
          ? `‘${records[0].title}’에서 ‘${latest!.title}’로 관심과 방법이 어떻게 달라졌나요?`
          : `${focus} 탐구 계획을 실행하면 무엇을 관찰할 수 있나요?`,
      reason:
        isolated.length > 1
          ? "연결 근거가 아직 드러나지 않는 기록들을 다시 읽고 공통 질문이나 방법을 찾아봅니다."
          : "실행과 성찰을 다음 계획으로 연결합니다.",
      method:
        "앞선 기록을 읽고 유지한 질문, 바뀐 방법, 새로 얻은 근거를 각각 한 문장으로 적으세요. 교사 피드백에서 다음 행동 한 가지를 정하세요.",
      output: "탐구 흐름 설명, 피드백 반영 내용, 다음 실행 계획",
      parentActivityIds: [
        ...new Set(
          [records[0]?.id, latest?.id].filter((id): id is string =>
            Boolean(id),
          ),
        ),
      ],
    },
  ];
  return {
    records,
    edges,
    isolated,
    covered,
    missing,
    suggestions,
    explicitCount: edges.filter((edge) => edge.kind === "explicit").length,
  };
}
