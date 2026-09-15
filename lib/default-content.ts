import type { FormQuestion } from "@/db/schema";

export const defaultActivityForm = {
  id: "activity-report-basic",
  title: "진로 연계 활동 보고서",
  description: "활동 동기부터 탐구 과정, 배운 점과 다음 계획까지 차근차근 기록합니다.",
  category: "공통 활동지",
  status: "published",
  questions: [
    { id: "q1", label: "이 활동을 시작한 이유는 무엇인가요?", type: "long_text", required: true },
    { id: "q2", label: "활동 과정에서 직접 조사하거나 시도한 내용을 적어주세요.", type: "long_text", required: true },
    { id: "q3", label: "새롭게 알게 된 점과 다음에 더 탐구하고 싶은 것은 무엇인가요?", type: "long_text", required: true },
  ] satisfies FormQuestion[],
};
