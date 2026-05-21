/**
 * 🚨 사기/노쇼 감지 유틸리티
 * 대화 패턴 기반 위험 신호 조기 감지
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskContext {
  dealStatus?: string;
  lastResponseDelay?: number; // 밀리초 단위
  messageCount?: number;
  hasPriceOffer?: boolean;
  hasSchedule?: boolean;
}

export interface RiskResult {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

/**
 * 리스크 점수 계산
 */
export function calculateRiskScore(
  messages: Array<{ text?: string; createdAt?: any; uid?: string }>,
  context: RiskContext
): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (!messages || messages.length === 0) {
    return { level: "LOW", score: 0, reasons: [] };
  }

  // 모든 메시지 텍스트 결합
  const allText = messages.map(m => m.text || "").join(" ").toLowerCase();

  // 🚨 사기 의심 패턴 (높은 위험)
  const scamPatterns = [
    { pattern: /카톡|카카오톡|외부.*연락|다른.*앱/, weight: 3, reason: "외부 연락 요구" },
    { pattern: /입금|계좌|선입금|먼저.*보내|보내주시면/, weight: 3, reason: "선입금 요구" },
    { pattern: /지금.*당장|바로.*입금|급하게/, weight: 2, reason: "급한 입금 압박" },
    { pattern: /택배.*불가|직거래.*불가|직접.*안/, weight: 2, reason: "직거래 거부" },
  ];

  for (const { pattern, weight, reason } of scamPatterns) {
    if (pattern.test(allText)) {
      score += weight;
      reasons.push(reason);
    }
  }

  // ⚠️ 비매너 / 공격적 패턴 (중간 위험)
  const aggressivePatterns = [
    { pattern: /왜.*답.*안|왜.*안.*해|왜.*이래/, weight: 1, reason: "공격적 말투" },
    { pattern: /빨리|지금.*당장|급해/, weight: 1, reason: "과도한 재촉" },
    { pattern: /싸게|더.*싸게|가격.*낮춰/, weight: 1, reason: "과도한 흥정" },
  ];

  for (const { pattern, weight, reason } of aggressivePatterns) {
    if (pattern.test(allText)) {
      score += weight;
      if (!reasons.includes(reason)) {
        reasons.push(reason);
      }
    }
  }

  // 🕐 노쇼 패턴 (상황 기반)
  if (context.dealStatus === "RESERVED") {
    // 예약 상태인데 응답 지연
    if (context.lastResponseDelay && context.lastResponseDelay > 24 * 60 * 60 * 1000) {
      score += 2;
      reasons.push("예약 후 장기간 무응답");
    }

    // 시간 계속 변경하는 패턴
    const timeChangeCount = (allText.match(/시간.*변경|일정.*변경|다음에|나중에/g) || []).length;
    if (timeChangeCount >= 2) {
      score += 2;
      reasons.push("일정 반복 변경");
    }
  }

  // 취소 반복 패턴
  const cancelCount = (allText.match(/취소|안.*할게|포기|그만/g) || []).length;
  if (cancelCount >= 2) {
    score += 1;
    reasons.push("반복 취소");
  }

  // 리스크 레벨 결정
  const level = riskLevel(score);

  return {
    level,
    score,
    reasons: [...new Set(reasons)], // 중복 제거
  };
}

/**
 * 리스크 레벨 정의
 */
export function riskLevel(score: number): RiskLevel {
  if (score >= 6) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

/**
 * 리스크 안내 메시지 생성
 */
export function getRiskMessage(risk: RiskResult): { title: string; message: string; actionText?: string } {
  if (risk.level === "HIGH") {
    return {
      title: "🚨 거래 주의",
      message: "이 대화는 사기 위험 신호가 감지되었습니다.\n직거래 또는 안전결제만 권장합니다.",
      actionText: "안전 거래 가이드 보기",
    };
  }

  if (risk.level === "MEDIUM") {
    return {
      title: "⚠️ 주의하세요",
      message: "외부 연락이나 선입금 요청은 사기 위험이 있습니다.\n직거래를 권장합니다.",
    };
  }

  return {
    title: "",
    message: "",
  };
}

