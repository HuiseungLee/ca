const careerSignals: Record<string, string[]> = {
  "환경공학": ["환경", "생태", "수질", "대기", "폐기물", "탄소", "에너지", "미세플라스틱", "정화", "지속가능"],
  "인공지능": ["인공지능", "알고리즘", "데이터", "모델", "학습", "분류", "예측", "자동화", "윤리"],
  "생명과학": ["생명", "세포", "유전자", "생태", "실험", "변인", "의학", "단백질", "미생물"],
  "도시계획": ["도시", "공간", "교통", "지역", "주거", "공원", "인구", "환경", "공공"],
};
const inquirySignals = ["비교", "분석", "실험", "조사", "데이터", "관찰", "측정", "검증", "설계", "해결"];

export function analyzeActivity(title: string, summary: string, career: string) {
  const source = `${title} ${summary}`.toLowerCase();
  const signals = careerSignals[career] ?? [...new Set(Object.values(careerSignals).flat())];
  const careerHits = signals.filter((keyword) => source.includes(keyword.toLowerCase()));
  const inquiryHits = inquirySignals.filter((keyword) => source.includes(keyword));
  const words = source.match(/[가-힣a-zA-Z0-9]{2,}/g) ?? [];
  const stopwords = new Set(["대한", "위한", "통해", "관한", "있는", "하는", "보고서", "계획서", "활동"]);
  const frequency = words.reduce<Record<string, number>>((acc, word) => {
    if (!stopwords.has(word)) acc[word] = (acc[word] ?? 0) + 1;
    return acc;
  }, {});
  const extracted = Object.entries(frequency).sort((a, b) => b[1] - a[1]).map(([word]) => word);
  const keywords = [...new Set([...careerHits, ...inquiryHits, ...extracted])].slice(0, 5);
  const fitScore = Math.min(96, 58 + careerHits.length * 5 + Math.min(12, inquiryHits.length * 3) + Math.min(10, Math.floor(summary.length / 80) * 2));
  const status = fitScore >= 82 ? "분석 완료" : "보완 필요";
  const evidence = careerHits.length ? `${careerHits.slice(0, 3).join("·")} 키워드가 ${career} 분야의 핵심 문제와 연결됩니다.` : "진로 분야의 핵심 개념을 탐구 과정이나 결과에 한 번 더 연결해 보세요.";
  const nextStep = inquiryHits.includes("실험") || inquiryHits.includes("측정") ? "수집한 자료의 변인과 한계를 정리하고 다른 조건에서 결과가 달라지는지 비교해 보세요." : "주제를 실제 사례나 관찰·측정 자료와 연결해 근거를 직접 만들어 보세요.";
  const teacherClue = inquiryHits.length >= 2 ? `자료를 ${inquiryHits.slice(0, 2).join("하고 ")}하며 진로 주제에 대한 탐구 과정을 구체화함.` : "관심 주제를 진로 분야와 연결하고 탐구 질문을 구체화하려는 태도를 보임.";
  return { keywords, fitScore, status, evidence, nextStep, teacherClue };
}
