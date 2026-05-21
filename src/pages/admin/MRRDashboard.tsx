import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { db } from "@/lib/firebase";
import {
  calculateMRRMetrics,
  type BillingDoc,
} from "@/features/billing/lib/mrr";
import { buildCohortRetentionTable, type CohortRetentionRow } from "@/lib/analytics/cohort";
import { buildMrrTrendFromEvents, type MrrTrendPoint } from "@/lib/analytics/mrrTrend";
import { summarizeUpgradeFlow, type UpgradeFlowSummary } from "@/lib/analytics/upgradeFlow";
import { calculateLtv, calculatePaybackMonths, getPaybackHealthLabel } from "@/lib/analytics/ltv";
import { buildLtvByPlan, type PlanLtvRow } from "@/lib/analytics/ltvByPlan";
import {
  calculateCac,
  calculateLtvCacRatio,
  getLtvCacHealthLabel,
  type GrowthSpendDoc,
} from "@/lib/analytics/cac";
import { forecastRevenueFromEvents, linearRegressionMrrForward, type RevenueForecast, type ForecastEventLike } from "@/lib/analytics/forecast";

/** R²가 이보다 낮으면 회귀 예측을 참고용으로만 표시 */
const FORECAST_REGRESSION_R2_LOW = 0.35;

type MrrState = {
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  active: number;
  trial: number;
  scheduled: number;
  churn: number;
};

export default function MRRDashboard() {
  const [data, setData] = useState<MrrState>({
    mrr: 0,
    arr: 0,
    arpu: 0,
    churnRate: 0,
    active: 0,
    trial: 0,
    scheduled: 0,
    churn: 0,
  });
  const [trend, setTrend] = useState<MrrTrendPoint[]>([]);
  const [cohortRows, setCohortRows] = useState<CohortRetentionRow[]>([]);
  const [flow, setFlow] = useState<UpgradeFlowSummary>({
    upgradeCount: 0,
    downgradeCount: 0,
    upgradeAmount: 0,
    downgradeAmount: 0,
    netAmount: 0,
  });
  const [growthSpend, setGrowthSpend] = useState<GrowthSpendDoc | null>(null);
  const [subscriptionEvents, setSubscriptionEvents] = useState<ForecastEventLike[]>([]);
  const [planLtv, setPlanLtv] = useState<PlanLtvRow[]>([]);
  const [forecast, setForecast] = useState<RevenueForecast>({
    currentMRR: 0,
    avgNewMRR: 0,
    avgExpansionMRR: 0,
    avgContractionMRR: 0,
    avgChurnMRR: 0,
    forecastMRR: 0,
    forecastGrowthPercent: 0,
    expectedChurnMRR: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        setError(null);
        const snap = await getDocs(collection(db, "teams"));
        const eventsSnap = await getDocs(
          query(collection(db, "subscription_events"), orderBy("occurredAt", "desc"), limit(10000))
        );
        const spendSnap = await getDocs(query(collection(db, "growth_spend"), orderBy("month", "desc"), limit(1)));
        if (cancelled) return;

        const docs = snap.docs.map((d) => d.data() as BillingDoc);
        const events = eventsSnap.docs.map((d) => d.data() as ForecastEventLike);
        const result = calculateMRRMetrics(docs);
        const trendData = buildMrrTrendFromEvents(events, 60);
        const cohortData = buildCohortRetentionTable(docs, 6);
        const flowData = summarizeUpgradeFlow(events, 30);
        const spendDoc = spendSnap.docs[0]?.data() as GrowthSpendDoc | undefined;
        const forecastData = forecastRevenueFromEvents(events, result.mrr);
        const byPlan = buildLtvByPlan(docs);
        setData(result);
        setTrend(trendData);
        setCohortRows(cohortData);
        setFlow(flowData);
        setGrowthSpend(spendDoc ?? null);
        setSubscriptionEvents(events);
        setPlanLtv(byPlan);
        setForecast(forecastData);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchSnapshot();
    return () => {
      cancelled = true;
    };
  }, []);

  const ltv = calculateLtv({ arpu: data.arpu, churnRatePercent: data.churnRate });
  const cac = calculateCac(growthSpend, { events: subscriptionEvents });
  const ltvCacRatio = calculateLtvCacRatio(ltv.ltv, cac.cac);
  const ltvCacHealth = getLtvCacHealthLabel(ltvCacRatio);
  const paybackMonths = calculatePaybackMonths(data.arpu, cac.cac);
  const paybackHealth = getPaybackHealthLabel(paybackMonths);
  const mrrReg = linearRegressionMrrForward(trend, 30);
  const trendPointCount = trend.length;
  const regressionLowConfidence = !loading && mrrReg.r2 < FORECAST_REGRESSION_R2_LOW;
  const regressionSubtitle = `시계열 ${trendPointCount}일 기준 · R² ${(mrrReg.r2 * 100).toFixed(0)}% · 일 추세 ${
    mrrReg.slopePerDay >= 0 ? "+" : ""
  }${Math.round(mrrReg.slopePerDay).toLocaleString("ko-KR")}원`;
  const ltvSubtitleParts = [
    `평균 수명 ${ltv.avgLifetimeMonths.toFixed(1)}개월`,
    ltv.wasChurnFloorApplied ? "최소 churn 하한" : null,
    ltv.wasLtvCapped ? "LTV 24M 상한" : null,
  ].filter(Boolean);
  const cacSubtitle =
    cac.cac > 0
      ? `${cac.month} · 유료 ${cac.newPaidTeams}팀${
          cac.newPaidTeams > 0 && cac.newPaidTeams === cac.newPaidTeamsFromEvents
            ? " (created 이벤트·동월)"
            : cac.newPaidTeamsFromEvents > 0
              ? ` (이벤트·동월 ${cac.newPaidTeamsFromEvents}건)`
              : ""
        }`
      : "growth_spend 또는 `subscription_events` (created) 필요";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">MRR Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Firestore snapshot 기준 매출 현황</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          데이터 로딩 실패: {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="MRR" value={`₩${data.mrr.toLocaleString("ko-KR")}`} loading={loading} />
        <MetricCard title="ARR" value={`₩${data.arr.toLocaleString("ko-KR")}`} loading={loading} />
        <MetricCard title="ARPU" value={`₩${Math.round(data.arpu).toLocaleString("ko-KR")}`} loading={loading} />
        <MetricCard title="Churn %" value={`${data.churnRate.toFixed(1)}%`} loading={loading} />
        <MetricCard title="Active" value={data.active.toLocaleString("ko-KR")} loading={loading} />
        <MetricCard title="Trial" value={data.trial.toLocaleString("ko-KR")} loading={loading} />
        <MetricCard title="Scheduled Churn" value={data.scheduled.toLocaleString("ko-KR")} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="LTV"
          value={`₩${Math.round(ltv.ltv).toLocaleString("ko-KR")}`}
          loading={loading}
          subtitle={ltvSubtitleParts.join(" · ")}
        />
        <MetricCard
          title="CAC"
          value={cac.cac > 0 ? `₩${Math.round(cac.cac).toLocaleString("ko-KR")}` : "-"}
          loading={loading}
          subtitle={cacSubtitle}
        />
        <MetricCard
          title="LTV:CAC"
          value={ltvCacRatio > 0 ? `${ltvCacRatio.toFixed(2)}x` : "-"}
          loading={loading}
          subtitle={`상태: ${ltvCacHealth}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title="Payback (월)"
          value={
            paybackMonths > 0
              ? `${paybackMonths.toFixed(1)}개월${paybackHealth !== "—" ? ` (${paybackHealth})` : ""}`
              : "-"
          }
          loading={loading}
          subtitle="CAC / ARPU · 6M 미만 건강 · 6~12M 보통 · 12M 초과 위험"
        />
        <MetricCard
          title="CAC (Ads) / (Organic)"
          value={
            cac.cacAds > 0 || cac.cacOrganic > 0
              ? `광고 ₩${Math.round(cac.cacAds).toLocaleString("ko-KR")} / 자연 ₩${Math.round(cac.cacOrganic).toLocaleString("ko-KR")}`
              : "—"
          }
          loading={loading}
          subtitle="growth_spend: adsSpend, newPaidTeamsAds 등"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">MRR Trend</p>
        <p className="mt-1 text-xs text-slate-500">최근 60일 이벤트 기반 MRR 변화 (created/renewed/canceled 반영)</p>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => Number(v).toLocaleString("ko-KR")} />
              <Tooltip
                formatter={(v: number | string) => [`₩${Number(v).toLocaleString("ko-KR")}`, "MRR"]}
                labelFormatter={(label) => `날짜: ${String(label)}`}
              />
              <Line type="monotone" dataKey="mrr" stroke="#4f46e5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">다음 달 MRR 예측 (비교)</h2>
          <p className="text-xs text-slate-500">롤링(최근 3개월 평균·보수) vs 회귀(시계열 추세·방향)</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Forecast MRR (롤링 3M)"
            value={`₩${Math.round(forecast.forecastMRR).toLocaleString("ko-KR")}`}
            loading={loading}
            subtitle={`현재 MRR ₩${Math.round(forecast.currentMRR).toLocaleString("ko-KR")} · net 변동 반영`}
          />
          <MetricCard
            title="Forecast MRR (회귀·30d)"
            value={mrrReg.forecastMrr > 0 ? `₩${Math.round(mrrReg.forecastMrr).toLocaleString("ko-KR")}` : "-"}
            loading={loading}
            subtitle={regressionSubtitle}
            caution={regressionLowConfidence}
            referenceHint={
              regressionLowConfidence
                ? "예측 신뢰도 낮음 — 데이터가 더 쌓이면 정확도가 올라갑니다."
                : undefined
            }
          />
          <MetricCard
            title="Forecast Growth % (롤링)"
            value={`${forecast.forecastGrowthPercent >= 0 ? "+" : ""}${forecast.forecastGrowthPercent.toFixed(1)}%`}
            loading={loading}
            subtitle="롤링 예측 vs 현재 MRR"
          />
          <MetricCard
            title="Expected Churn MRR (롤링)"
            value={`₩${Math.round(forecast.expectedChurnMRR).toLocaleString("ko-KR")}`}
            loading={loading}
            subtitle="3개월 평균 churn MRR"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          title="Upgrade (30일)"
          value={`+₩${Math.round(flow.upgradeAmount).toLocaleString("ko-KR")}`}
          loading={loading}
          subtitle={`${flow.upgradeCount.toLocaleString("ko-KR")}건`}
        />
        <MetricCard
          title="Downgrade (30일)"
          value={`-₩${Math.round(flow.downgradeAmount).toLocaleString("ko-KR")}`}
          loading={loading}
          subtitle={`${flow.downgradeCount.toLocaleString("ko-KR")}건`}
        />
        <MetricCard
          title="Net Flow (30일)"
          value={`${flow.netAmount >= 0 ? "+" : "-"}₩${Math.round(Math.abs(flow.netAmount)).toLocaleString("ko-KR")}`}
          loading={loading}
        />
      </div>

      {planLtv.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-700">LTV (플랜별)</p>
          <p className="mt-1 text-xs text-slate-500">팀 `plan` 기준, active MRR / 이번 달 churn / 하한·상한 동일</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2 font-medium">플랜</th>
                  <th className="px-2 py-2 font-medium">Active</th>
                  <th className="px-2 py-2 font-medium">MRR</th>
                  <th className="px-2 py-2 font-medium">ARPU</th>
                  <th className="px-2 py-2 font-medium">LTV</th>
                </tr>
              </thead>
              <tbody>
                {planLtv.map((row) => (
                  <tr key={row.plan} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-800">{row.plan}</td>
                    <td className="px-2 py-2 text-slate-700">{row.active.toLocaleString("ko-KR")}</td>
                    <td className="px-2 py-2 text-slate-700">₩{Math.round(row.mrr).toLocaleString("ko-KR")}</td>
                    <td className="px-2 py-2 text-slate-700">₩{Math.round(row.arpu).toLocaleString("ko-KR")}</td>
                    <td className="px-2 py-2 text-slate-700">₩{Math.round(row.ltv.ltv).toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Cohort / Retention</p>
        <p className="mt-1 text-xs text-slate-500">최근 6개 코호트 기준 D1 / D7 / D30 잔존율</p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-2 py-2 font-medium">가입월</th>
                <th className="px-2 py-2 font-medium">표본</th>
                <th className="px-2 py-2 font-medium">D1</th>
                <th className="px-2 py-2 font-medium">D7</th>
                <th className="px-2 py-2 font-medium">D30</th>
              </tr>
            </thead>
            <tbody>
              {cohortRows.map((row) => (
                <tr key={row.cohort} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-medium text-slate-800">{row.cohort}</td>
                  <td className="px-2 py-2 text-slate-700">{row.size.toLocaleString("ko-KR")}</td>
                  <td className="px-2 py-2 text-slate-700">{row.d1.toFixed(1)}%</td>
                  <td className="px-2 py-2 text-slate-700">{row.d7.toFixed(1)}%</td>
                  <td className="px-2 py-2 text-slate-700">{row.d30.toFixed(1)}%</td>
                </tr>
              ))}
              {cohortRows.length === 0 && !loading ? (
                <tr>
                  <td className="px-2 py-3 text-xs text-slate-500" colSpan={5}>
                    코호트 계산용 데이터가 아직 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs text-amber-900">
          참고: Churn(이번 달)은 `billingStatus === canceled` + `canceledAt` 기준이며, Scheduled는
          `cancelAtPeriodEnd === true`를 별도 집계합니다.
        </p>
        <p className="mt-1 text-xs text-amber-900">
          CAC는 `growth_spend` 최근 1문서(월 `month` 권장) + `newPaidTeams`가 비면 동월
          `subscription_events`(type=created) 수로 대체합니다. 채널: `adsSpend`/`organicSpend`,
          `newPaidTeamsAds`/`newPaidTeamsOrganic` 옵션. LTV는 월 churn 하한(0.01%·과대 방지)과
          24개월 LTV 상한이 적용됩니다.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  loading,
  subtitle,
  caution,
  referenceHint,
}: {
  title: string;
  value: string;
  loading: boolean;
  subtitle?: string;
  /** R² 낮음 등 — 테두리·배경만 살짝 강조 */
  caution?: boolean;
  /** 참고용·신뢰도 안내 문구 */
  referenceHint?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        caution
          ? "border-amber-300 bg-amber-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? "로딩 중..." : value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      {referenceHint ? <p className="mt-2 text-xs font-medium text-amber-900">{referenceHint}</p> : null}
    </div>
  );
}
