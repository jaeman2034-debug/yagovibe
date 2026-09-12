/** Server-side OpenAI 없이 운영 로그 집계 기반 인사이트 (Migration 1 — single SoT). */
export type HeuristicInsight = {
  title: string;
  headline: string;
  bullets: string[];
  actions: string[];
  action: string;
};

type AggLike = {
  date?: string;
  total?: number;
  intents?: Record<string, number>;
  keywords?: Record<string, number>;
  hours?: Record<string, number>;
};

function topEntry(map: Record<string, number> | undefined): [string, number] | null {
  if (!map) return null;
  const entries = Object.entries(map).filter(([, v]) => typeof v === "number" && v > 0);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return [entries[0][0], entries[0][1]];
}

export function buildHeuristicInsightFromAgg(agg: AggLike): HeuristicInsight {
  const total = agg.total ?? 0;
  const topIntent = topEntry(agg.intents);
  const topKeyword = topEntry(agg.keywords);
  const topHour = topEntry(agg.hours);
  const date = agg.date ?? "오늘";

  const bullets = [
    `${date} 기준 음성/명령 로그 ${total}건이 집계되었습니다.`,
    topIntent
      ? `가장 많은 intent는 「${topIntent[0]}」(${topIntent[1]}건)입니다.`
      : "intent 분포 데이터가 충분하지 않습니다.",
    topKeyword
      ? `상위 검색/키워드는 「${topKeyword[0]}」(${topKeyword[1]}회)입니다.`
      : "키워드 분포 데이터가 충분하지 않습니다.",
  ];
  if (topHour) {
    bullets.push(`활동이 많은 시간대: ${topHour[0]}시 (${topHour[1]}건).`);
  }

  const action =
    total === 0
      ? "현장/앱에서 voice_logs 수집이 동작하는지 확인하세요."
      : "상위 intent·키워드에 맞춰 팀 공지 또는 지도 UX를 점검하세요.";

  const headline = total > 0 ? "로그 집계 기반 운영 인사이트 (서버 AI 미사용)" : "오늘 수집된 로그가 없습니다";

  return {
    title: headline,
    headline,
    bullets,
    actions: [action],
    action,
  };
}
