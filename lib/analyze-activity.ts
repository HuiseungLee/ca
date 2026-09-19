type CareerFamily = { aliases: string[]; concepts: string[]; extensions: string[] };

const careerFamilies: Record<string, CareerFamily> = {
  "화학공학": { aliases: ["화학공학", "화공", "공정공학"], concepts: ["화학반응", "촉매", "물질수지", "에너지수지", "반응공학", "분리공정", "열역학", "공정설계", "고분자", "배터리", "반도체", "유체", "열전달"], extensions: ["반응 조건에 따른 수율 변화를 비교하고 공정의 안전성과 환경 영향을 함께 분석해 보세요."] },
  "의예·의학": { aliases: ["의예", "의학", "의사", "의료"], concepts: ["인체", "질환", "진단", "치료", "병리", "생리", "임상", "역학", "환자", "의료윤리", "예방", "약물"], extensions: ["질환의 발생 기전과 진단·예방 방법을 근거 자료로 비교하고 의료윤리 관점까지 확장해 보세요."] },
  "교육": { aliases: ["교육", "교사", "사범", "교육학"], concepts: ["학습자", "교수학습", "교육과정", "평가", "수업설계", "발달", "교육격차", "상호작용", "피드백", "문해력", "동기", "교실"], extensions: ["학습자 특성을 고려한 수업 방법을 설계하고 실제 피드백이나 관찰 자료로 효과를 확인해 보세요."] },
  "환경공학": { aliases: ["환경공학", "환경", "기후"], concepts: ["생태", "수질", "대기", "폐기물", "탄소", "에너지", "미세플라스틱", "정화", "지속가능", "오염", "순환", "환경영향"], extensions: ["오염 원인을 측정 가능한 지표로 바꾸고 해결 기술의 효율과 한계를 비교해 보세요."] },
  "인공지능·컴퓨터": { aliases: ["인공지능", "컴퓨터", "소프트웨어", "데이터", "개발자"], concepts: ["알고리즘", "데이터", "모델", "학습", "분류", "예측", "자동화", "프로그래밍", "네트워크", "보안", "편향", "인공지능윤리"], extensions: ["같은 문제를 해결하는 두 알고리즘을 데이터로 비교하고 정확도뿐 아니라 편향과 활용 한계도 분석해 보세요."] },
  "생명과학": { aliases: ["생명과학", "생명", "바이오", "생명공학"], concepts: ["세포", "유전자", "단백질", "미생물", "대사", "유전", "항상성", "생태", "효소", "면역", "생물정보", "실험변인"], extensions: ["생명 현상의 원리를 검증할 수 있도록 독립·종속 변인을 정하고 예상 결과와 한계를 설계해 보세요."] },
  "도시·건축": { aliases: ["도시", "건축", "도시계획", "토목"], concepts: ["공간", "교통", "지역", "주거", "공원", "인구", "도시재생", "공공", "구조", "설계", "안전", "접근성"], extensions: ["지역의 실제 공간 자료와 이용자 요구를 조사해 개선안을 설계하고 예상 효과를 비교해 보세요."] },
  "경영·경제": { aliases: ["경영", "경제", "회계", "금융"], concepts: ["시장", "소비자", "기업", "수요", "공급", "비용", "수익", "마케팅", "재무", "경영전략", "경제정책", "불평등"], extensions: ["이해관계자와 시장 자료를 바탕으로 대안을 비교하고 비용·효과와 사회적 영향을 함께 분석해 보세요."] },
  "인문·사회": { aliases: ["문학", "역사", "사회", "정치", "심리", "철학", "언론"], concepts: ["맥락", "관점", "담론", "문화", "사회구조", "정책", "행동", "인식", "사료", "텍스트", "윤리", "의사소통"], extensions: ["서로 다른 자료와 관점을 비교하고 그 차이가 생긴 사회·문화적 맥락을 근거와 함께 해석해 보세요."] },
  "예술·디자인": { aliases: ["미술", "디자인", "음악", "예술", "영상"], concepts: ["조형", "색채", "시각", "사용자경험", "표현", "구성", "매체", "창작", "감상", "미학", "스토리텔링", "프로토타입"], extensions: ["표현 의도와 대상의 경험을 연결해 시안을 제작하고 피드백을 반영한 변화 과정을 기록해 보세요."] },
};

const inquirySignals = ["비교", "분석", "실험", "조사", "관찰", "측정", "검증", "설계", "인터뷰", "통계", "모형", "제작"];
const evidenceSignals = ["결과", "수치", "자료", "출처", "근거", "변인", "한계", "오차", "피드백", "사례"];
const reflectionSignals = ["배웠", "알게", "달랐", "성찰", "개선", "다음", "추가", "확장", "새롭게"];

function normalize(value: string) { return value.toLowerCase().replace(/\s+/g, ""); }
function findFamily(career: string) {
  const normalized = normalize(career);
  return Object.entries(careerFamilies).find(([, family]) => family.aliases.some((alias) => normalized.includes(normalize(alias))));
}
function hits(source: string, words: string[]) { return words.filter((word) => source.includes(normalize(word))); }

export function analyzeActivity(title: string, summary: string, career: string) {
  const source = normalize(`${title} ${summary}`);
  const meaningfulWords = summary.match(/[가-힣a-zA-Z]{2,}/g) ?? [];
  const family = findFamily(career);
  const careerHits = family ? hits(source, family[1].concepts) : [];
  const inquiryHits = hits(source, inquirySignals);
  const evidenceHits = hits(source, evidenceSignals);
  const reflectionHits = hits(source, reflectionSignals);
  const isMeaningful = summary.trim().length >= 30 && meaningfulWords.length >= 5;

  const conceptScore = Math.min(45, careerHits.length * 9);
  const inquiryScore = Math.min(25, inquiryHits.length * 5);
  const evidenceScore = Math.min(20, evidenceHits.length * 4);
  const depthScore = Math.min(10, Math.floor(summary.trim().length / 120) * 3 + Math.min(4, reflectionHits.length * 2));
  const fitScore = isMeaningful ? Math.min(100, conceptScore + inquiryScore + evidenceScore + depthScore) : 0;
  const status = !isMeaningful ? "분석 불가" : fitScore >= 70 ? "분석 완료" : "보완 필요";

  const frequency = meaningfulWords.reduce<Record<string, number>>((acc, word) => { const key = word.toLowerCase(); acc[key] = (acc[key] ?? 0) + 1; return acc; }, {});
  const frequent = Object.entries(frequency).sort((a, b) => b[1] - a[1]).map(([word]) => word);
  const keywords = [...new Set([...careerHits, ...inquiryHits, ...evidenceHits, ...frequent])].slice(0, 6);
  const familyName = family?.[0] ?? career;
  const evidence = !isMeaningful
    ? "분석하려면 활동 과정과 배운 점을 구체적인 문장으로 작성해야 합니다."
    : careerHits.length
      ? `${careerHits.slice(0, 4).join("·")} 개념과 ${inquiryHits.slice(0, 3).join("·") || "탐구 과정"}이 ${familyName} 분야와 연결됩니다.`
      : `${familyName} 분야의 핵심 개념을 활동의 질문·과정·결과에 구체적으로 연결해 보세요.`;
  const nextStep = family?.[1].extensions[0] ?? "희망 진로에서 중요하게 다루는 개념을 찾아 실제 사례나 조사·실험 자료로 확인해 보세요.";
  const teacherClue = !isMeaningful
    ? "작성 내용이 짧거나 구체적인 탐구 과정이 부족하여 추가 확인이 필요함."
    : `진로 핵심 개념 ${careerHits.length}개, 탐구 과정 ${inquiryHits.length}개, 근거·성찰 요소 ${evidenceHits.length + reflectionHits.length}개가 확인됨.`;
  return { keywords, fitScore, status, evidence, nextStep, teacherClue };
}
