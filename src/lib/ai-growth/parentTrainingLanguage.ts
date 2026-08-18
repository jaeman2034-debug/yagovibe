import type { TrainingRecommendation } from "@/lib/tacticalAgent/recommendTrainingV1";

/** Sprint D-2a — 코치 drill title → 보호자 plain language (Pilot #3) */
export const PARENT_TRAINING_TITLE_MAP: Readonly<Record<string, string>> = {
  "2v1 의사결정 연속 플레이": "두 명이 한 명의 수비를 뚫는 연습",
  "4v4 공간 창출 미니게임": "빈 공간을 찾아 움직이는 연습 게임",
  "전환 후 5초 내 재공격": "공을 빼앗은 뒤 빠르게 공격하는 연습",
  "3존 패스·이동 공간 인식": "구역별로 패스하며 자리 찾기 연습",
  "헤드업 패스 서클": "고개를 들고 패스하는 원형 연습",
  "360° 시야 스캔 드릴": "주변을 살피며 공격하는 연습",
  "제한 터치 빌드업": "적은 터치로 공을 앞으로 올리는 연습",
  "3v2 압박 탈출 훈련": "여러 명의 압박 속에서 공 빼내기 연습",
  "Rondo 압박 대응 (4v2)": "압박 받을 때 패스 유지 연습",
  "오버·언더 래핑 패턴": "옆 공간으로 빠르게 돌파하는 연습",
};

/** 보호자용 한 줄 설명 (FII 점수 rationale 대체) */
export const PARENT_TRAINING_HINT_MAP: Readonly<Record<string, string>> = {
  "2v1 의사결정 연속 플레이": "패스와 돌파 중 더 좋은 선택을 빠르게 하는 연습입니다.",
  "4v4 공간 창출 미니게임": "공 없이도 좋은 자리로 움직이는 습관을 키웁니다.",
  "전환 후 5초 내 재공격": "공을 되찾은 뒤 바로 공격하는 타이밍을 익힙니다.",
  "3존 패스·이동 공간 인식": "코트를 나눠 패스와 이동으로 열린 공간을 찾습니다.",
  "헤드업 패스 서클": "공을 보지 않고 주변을 살피며 패스하는 연습입니다.",
  "360° 시야 스캔 드릴": "공 주변 상황을 먼저 보고 다음 행동을 정합니다.",
  "제한 터치 빌드업": "짧은 터치로 팀 공격을 차분히 전개합니다.",
  "3v2 압박 탈출 훈련": "압박 상황에서도 침착하게 공을 연결합니다.",
  "Rondo 압박 대응 (4v2)": "좁은 공간에서도 패스로 압박을 풀어냅니다.",
  "오버·언더 래핑 패턴": "옆 라인을 활용해 수비를 피해 공간을 만듭니다.",
};

export function getParentTrainingDescription(coachTitle: string): string {
  return PARENT_TRAINING_TITLE_MAP[coachTitle] ?? coachTitle;
}

/** 보호자용 제목 — `설명 · N분` (Pilot D-2 형식) */
export function formatParentTrainingTitle(coachTitle: string, durationMinutes: number): string {
  return `${getParentTrainingDescription(coachTitle)} · ${durationMinutes}분`;
}

export function getParentTrainingHint(coachTitle: string): string | null {
  return PARENT_TRAINING_HINT_MAP[coachTitle] ?? null;
}

/** PDF · Parent View용 — 코치 추천 1건을 보호자 언어로 변환 */
export function toParentTrainingRecommendation(
  rec: TrainingRecommendation
): TrainingRecommendation {
  const hint = getParentTrainingHint(rec.title);
  return {
    ...rec,
    title: formatParentTrainingTitle(rec.title, rec.durationMinutes),
    rationale: hint ?? rec.rationale,
  };
}

export function mapRecommendationsForParent(
  recommendations: TrainingRecommendation[]
): TrainingRecommendation[] {
  return recommendations.map(toParentTrainingRecommendation);
}
