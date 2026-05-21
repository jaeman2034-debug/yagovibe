/**
 * 🚀 Autopilot Rules Engine - 무인 운영 오토파일럿 1.0
 * 
 * 목표: 지표 보고 스스로 움직이는 시스템
 */

export type Signal = {
  ctr: number; // Story CTR
  reserveCr: number; // Reserve Conversion Rate
  payFail: number; // Payment Fail Rate
  fillRate: number; // Story Fill Rate (0-1)
  teamJoins: number; // Daily team joins
  cancelRate: number; // Cancellation rate
};

export type Action =
  | { type: "REPLACE_STORY"; reason: string }
  | { type: "DISCOUNT_ON"; reason: string }
  | { type: "PAY_PROTECT"; reason: string }
  | { type: "NEED_SLOT"; reason: string }
  | { type: "BOOST_RECRUIT"; reason: string }
  | { type: "ALERT_OPERATOR"; reason: string; severity: "warning" | "critical" };

/**
 * 룰 엔진: Signal → Action 결정
 */
export function decideAction(signal: Signal): Action[] {
  const actions: Action[] = [];

  // 1. CTR 하락 → 스토리 자동 교체
  if (signal.ctr < 0.02) {
    actions.push({
      type: "REPLACE_STORY",
      reason: `CTR ${(signal.ctr * 100).toFixed(2)}% < 2% 임계값`,
    });
  }

  // 2. Reserve CR 하락 → 할인 자동 ON
  if (signal.reserveCr < 0.18) {
    actions.push({
      type: "DISCOUNT_ON",
      reason: `Reserve CR ${(signal.reserveCr * 100).toFixed(2)}% < 18% 임계값`,
    });
  }

  // 3. PayFail 급등 → 결제 보호 모드
  if (signal.payFail > 0.05) {
    actions.push({
      type: "PAY_PROTECT",
      reason: `PayFail Rate ${(signal.payFail * 100).toFixed(2)}% > 5% 임계값`,
    });
  }

  // 4. FillRate 부족 → 슬롯 보충 필요
  if (signal.fillRate < 1.0) {
    actions.push({
      type: "NEED_SLOT",
      reason: `FillRate ${(signal.fillRate * 100).toFixed(0)}% < 100%`,
    });
  }

  // 5. 팀 가입 부족 → 모집 스토리 부스팅
  if (signal.teamJoins < 2) {
    actions.push({
      type: "BOOST_RECRUIT",
      reason: `일 가입 ${signal.teamJoins}명 < 2명 임계값`,
    });
  }

  // 6. 취소율 급등 → 운영자 알림
  if (signal.cancelRate > 0.12) {
    actions.push({
      type: "ALERT_OPERATOR",
      reason: `취소율 ${(signal.cancelRate * 100).toFixed(2)}% > 12% 임계값`,
      severity: "critical",
    });
  }

  return actions;
}

/**
 * 액션 우선순위 정렬
 */
export function prioritizeActions(actions: Action[]): Action[] {
  const priority: Record<Action["type"], number> = {
    PAY_PROTECT: 1, // 최우선
    ALERT_OPERATOR: 2,
    REPLACE_STORY: 3,
    NEED_SLOT: 4,
    DISCOUNT_ON: 5,
    BOOST_RECRUIT: 6,
  };

  return actions.sort((a, b) => {
    const aP = priority[a.type] || 999;
    const bP = priority[b.type] || 999;
    return aP - bP;
  });
}
