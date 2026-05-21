import type { TeamMonthlyChartPoint } from "../hooks/useTeamMonthlyStatsSeries";
import type { TeamMonthlyStatsDoc } from "../types/teamMonthlyStats";
import { seoulYyyyMm } from "./seoulFeeDue";

export type FeeKpiInsightTone = "positive" | "warning" | "negative" | "neutral";

export type FeeKpiInsight = {
  tone: FeeKpiInsightTone;
  text: string;
};

function monthHasSignal(p: TeamMonthlyChartPoint): boolean {
  return (
    (p.totalSlots ?? 0) > 0 ||
    p.revenue > 0 ||
    p.paymentRate > 0 ||
    p.overdueRate > 0 ||
    (p.autopaySuccessCount ?? 0) + (p.autopayFailCount ?? 0) > 0
  );
}

function pickPreviousComparable(points: TeamMonthlyChartPoint[], curIdx: number): TeamMonthlyChartPoint | null {
  for (let i = curIdx - 1; i >= 0; i--) {
    if (monthHasSignal(points[i])) return points[i];
  }
  return null;
}

function fmtPctPoint(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : ""}${r}%p`;
}

/**
 * statsMonthly 시계열 + (선택) 이번 달 상세 문서로 짧은 운영 인사이트 문장 생성.
 * Firestore 없이 클라이언트만 사용.
 */
export function buildTeamFeeKpiInsights(
  points: TeamMonthlyChartPoint[],
  currentDoc: TeamMonthlyStatsDoc | null
): FeeKpiInsight[] {
  const out: FeeKpiInsight[] = [];
  if (!points.length) return out;

  const curKey = seoulYyyyMm();
  const curIdx = points.findIndex((p) => p.month === curKey);
  const cur = curIdx >= 0 ? points[curIdx] : points[points.length - 1];
  const prev = pickPreviousComparable(points, curIdx >= 0 ? curIdx : points.length - 1);

  const slots = currentDoc?.totalSlots ?? cur.totalSlots ?? 0;
  if (slots === 0 && !monthHasSignal(cur)) {
    out.push({
      tone: "neutral",
      text: "이번 달 마감 회비가 없거나 아직 집계되지 않았습니다. 집계가 쌓이면 인사이트가 표시됩니다.",
    });
    return out;
  }

  const apAttempts =
    (currentDoc?.autopaySuccessCount ?? cur.autopaySuccessCount ?? 0) +
    (currentDoc?.autopayFailCount ?? cur.autopayFailCount ?? 0);

  // —— 납부율 (전월 대비) ——
  if (prev && monthHasSignal(prev)) {
    const d = cur.paymentRate - prev.paymentRate;
    if (d <= -5) {
      out.push({
        tone: "negative",
        text: `납부율이 전월 대비 ${fmtPctPoint(d)} 하락했습니다. 미납 멤버 독촉·납부 안내를 검토해 보세요.`,
      });
    } else if (d >= 5) {
      out.push({
        tone: "positive",
        text: `납부율이 전월 대비 ${fmtPctPoint(d)} 상승했습니다.`,
      });
    } else if (d <= -3) {
      out.push({
        tone: "warning",
        text: `납부율이 전월 대비 ${fmtPctPoint(d)} 소폭 하락했습니다.`,
      });
    }
  }

  // —— 연체율 (절대 + 전월) ——
  if (cur.overdueRate >= 25) {
    out.push({
      tone: "negative",
      text: `연체율이 ${cur.overdueRate}%로 높습니다. 연체 멤버 정비와 별도 연락을 권장합니다.`,
    });
  } else if (cur.overdueRate >= 15) {
    out.push({
      tone: "warning",
      text: `연체율이 ${cur.overdueRate}%입니다. 독촉 일정과 납부 채널을 점검해 보세요.`,
    });
  }

  if (prev && monthHasSignal(prev)) {
    const dO = cur.overdueRate - prev.overdueRate;
    if (dO >= 6 && cur.overdueRate < 25) {
      out.push({
        tone: "warning",
        text: `연체율이 전월 대비 ${fmtPctPoint(dO)} 올랐습니다. 미납 추이를 주의 깊게 보세요.`,
      });
    } else if (dO <= -6) {
      out.push({
        tone: "positive",
        text: `연체율이 전월 대비 ${fmtPctPoint(dO)} 내려갔습니다.`,
      });
    }
  }

  // —— 자동결제 성공률 ——
  if (apAttempts >= 3) {
    if (cur.autopaySuccessRate >= 90) {
      out.push({
        tone: "positive",
        text: `자동결제 성공률이 ${cur.autopaySuccessRate}%로 안정적으로 작동 중입니다.`,
      });
    } else if (cur.autopaySuccessRate < 70) {
      out.push({
        tone: "warning",
        text: `자동결제 성공률이 ${cur.autopaySuccessRate}%입니다. 카드 재등록 안내·빌링 프로필 상태를 확인해 보세요.`,
      });
    }
  }

  if (prev && monthHasSignal(prev) && prev.revenue > 0) {
    const revPct = ((cur.revenue - prev.revenue) / prev.revenue) * 100;
    if (revPct <= -12) {
      out.push({
        tone: "negative",
        text: `이번 달 수익이 전월 대비 약 ${Math.round(Math.abs(revPct))}% 감소했습니다.`,
      });
    } else if (revPct >= 12) {
      out.push({
        tone: "positive",
        text: `이번 달 수익이 전월 대비 약 ${Math.round(revPct)}% 증가했습니다.`,
      });
    }
  }

  // —— 납부율 단독 (전월 비교 없을 때) ——
  if (!prev && slots > 0) {
    if (cur.paymentRate >= 85) {
      out.push({ tone: "positive", text: `납부율이 ${cur.paymentRate}%로 양호한 편입니다.` });
    } else if (cur.paymentRate < 60) {
      out.push({
        tone: "warning",
        text: `납부율이 ${cur.paymentRate}%입니다. 독촉·기한 안내를 강화하면 회수에 도움이 됩니다.`,
      });
    }
  }

  if (out.length === 0) {
    out.push({
      tone: "neutral",
      text: "전월 대비 큰 변화는 없습니다. 지표를 주기적으로 확인해 주세요.",
    });
  }

  return out.slice(0, 6);
}
