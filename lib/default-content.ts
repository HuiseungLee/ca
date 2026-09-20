import type { FormQuestion } from "@/db/schema";

export const defaultActivityForm = {
  id: "activity-report-basic",
  title: "진로 연계 활동 보고서",
  description: "활동 동기부터 탐구 과정, 배운 점과 다음 계획까지 차근차근 기록합니다.",
  category: "공통 과제",
  status: "published",
  distributionMode: "all",
  targetIds: [] as string[],
  projectId: null,
  questions: [
    { id: "q1", label: "이 활동을 시작한 이유는 무엇인가요?", type: "long_text", required: true },
    { id: "q2", label: "활동 과정에서 직접 조사하거나 시도한 내용을 적어주세요.", type: "long_text", required: true },
    { id: "q3", label: "새롭게 알게 된 점과 다음에 더 탐구하고 싶은 것은 무엇인가요?", type: "long_text", required: true },
  ] satisfies FormQuestion[],
};

export const individualActivityForm = {
  ...defaultActivityForm,
  id: "individual-inquiry",
  title: "개별 탐구 과제",
  category: "개별 탐구 과제",
  description: "새로운 계획 또는 완료한 탐구를 기록하세요. 이전 활동을 선택하면 탐구의 연결 흐름이 함께 저장됩니다.",
  distributionMode: "all" as const,
  questions: [
    { id: "motivation", label: "탐구 질문과 진로와의 연결", type: "long_text", required: true, placeholder: "무엇이 궁금하며 희망 진로와 어떤 관련이 있나요?" },
    { id: "process", label: "탐구 과정 또는 실행 계획", type: "long_text", required: true, placeholder: "비교할 대상, 조사·실험 방법, 활용할 자료를 구체적으로 적어주세요." },
    { id: "reflection", label: "결과·배운 점·다음 질문", type: "long_text", required: false, placeholder: "계획 단계라면 예상 결과와 확인하고 싶은 점을 적어주세요." },
  ] satisfies FormQuestion[],
};
