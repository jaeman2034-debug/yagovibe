export async function getDashboardSummary() {
  const res = await fetch("/api/admin/dashboard/summary");
  if (!res.ok) throw new Error("summary failed");
  return res.json();
}

export async function getDashboardHealth() {
  const res = await fetch("/api/admin/dashboard/health");
  if (!res.ok) throw new Error("health failed");
  return res.json();
}

export async function getDashboardStories() {
  const res = await fetch("/api/admin/dashboard/stories");
  if (!res.ok) throw new Error("stories failed");
  return res.json();
}

export interface DashboardActivity {
  date: string;
  summary: {
    dau: number; // 오늘 활성 유저
    pageViews: number; // 총 페이지뷰
    totalEvents: number; // 총 이벤트 수
  };
  topEvents: Array<{ event: string; count: number }>; // 기능별 클릭 TOP5
  sportDistribution: Record<string, number>; // 종목 선택 분포
  team: {
    joins: number;
    createClicks: number;
    views: number;
  };
  market: {
    views: number;
    itemClicks: number;
  };
  communication: {
    chatOpens: number;
    notiClicks: number;
  };
  search: {
    count: number;
  };
  timestamp: string;
}

export async function getDashboardActivity(region: string = "seoul", date?: string): Promise<DashboardActivity> {
  const params = new URLSearchParams({ region, ...(date && { date }) });
  const res = await fetch(`/api/admin/dashboard/activity?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard activity: ${res.statusText}`);
  return res.json();
}

export interface DashboardFunnel {
  date: string;
  range: string;
  funnel: {
    step1_sportSelected: number;
    step2_storyImpression: number;
    step3_storyClick: number;
    step4_activationViews: number;
    step5_teamJoin: number;
  };
  kpi: {
    ctr: number;
    activationRate: number;
    deepConversion: number;
  };
  sportDistribution: Record<string, {
    selected: number;
    impressions: number;
    clicks: number;
    views: number;
    joins: number;
  }>;
  lowCtrStories: Array<{
    storyId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  summaryComment: string;
  timestamp: string;
}

export async function getDashboardFunnel(range: string = "today", date?: string): Promise<DashboardFunnel> {
  const params = new URLSearchParams({ range, ...(date && { date }) });
  const res = await fetch(`/api/admin/dashboard/funnel?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch dashboard funnel: ${res.statusText}`);
  return res.json();
}
