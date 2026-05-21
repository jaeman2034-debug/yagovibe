import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { collectionGroup, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CreditCard,
  LineChart,
  RefreshCcw,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { db, functions } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoleGate } from "@/hooks/useRoleGate";

type PlatformMetricsDoc = {
  totalFederations?: number;
  totalTeams?: number;
  billingHealthyTeams?: number;
  pastDueTeams?: number;
  restrictedTeams?: number;
  /** Stripe 제한 해제(누적) — 웹훅 increment */
  recentRecoveredBillingTeams?: number;
  recentRecoveredBillingTeams7d?: number;
  recentRecoveredBillingTeams30d?: number;
  totalMRR?: number;
  totalMRRByCurrency?: Record<string, number>;
  activeSubscriptions?: number;
  churnedSubscriptions7d?: number;
  churnedSubscriptions30d?: number;
  trialToPaidConversions7d?: number;
  trialToPaidConversions30d?: number;
  highRiskTeams?: number;
  highRiskTeamIds?: string[];
  highRiskDay0Teams?: number;
  highRiskDay3Teams?: number;
  highRiskDay7Teams?: number;
  activeTeams7d?: number;
  inactiveTeams7d?: number;
  activeTeams30d?: number;
  inactiveTeams30d?: number;
  freeTeams?: number;
  totalMembers?: number;
  pastDueTeamIds?: string[];
  restrictedTeamIds?: string[];
  inactiveTeamIds?: string[];
  source?: string;
  updatedAt?: { toDate?: () => Date };
};

type VariantCounts = {
  sent: number;
  opened: number;
  clicked: number;
  reactivated: number;
};

type AbSummary = {
  a: VariantCounts;
  b: VariantCounts;
  cohortNew: { a: VariantCounts; b: VariantCounts };
  cohortExisting: { a: VariantCounts; b: VariantCounts };
};

type ExperimentDecision = {
  status?: string;
  winner?: "A" | "B";
  rollout?: string;
  uplift?: number;
  sampleSize?: { A?: number; B?: number };
};

function num(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return v.toLocaleString("ko-KR");
  return "—";
}

function calcArpu(totalMrr?: number, activeSubs?: number): number {
  const mrr = Number(totalMrr ?? 0);
  const subs = Math.floor(Number(activeSubs ?? 0));
  if (!Number.isFinite(mrr) || !Number.isFinite(subs) || subs <= 0) return 0;
  return Math.round(mrr / subs);
}

function calcNetRevenue(period: "7d" | "30d", m: PlatformMetricsDoc | null): number {
  if (!m) return 0;
  const conv = period === "7d" ? Number(m.trialToPaidConversions7d ?? 0) : Number(m.trialToPaidConversions30d ?? 0);
  const rec = period === "7d" ? Number(m.recentRecoveredBillingTeams7d ?? 0) : Number(m.recentRecoveredBillingTeams30d ?? 0);
  const churn = period === "7d" ? Number(m.churnedSubscriptions7d ?? 0) : Number(m.churnedSubscriptions30d ?? 0);
  return Math.floor(conv + rec - churn);
}

function emptyCounts(): VariantCounts {
  return { sent: 0, opened: 0, clicked: 0, reactivated: 0 };
}

function numOrZero(v: unknown): number {
  const n = Math.floor(Number(v ?? 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function ratePct(reactivated: number, sent: number): number {
  if (!Number.isFinite(reactivated) || !Number.isFinite(sent) || sent <= 0) return 0;
  return (reactivated / sent) * 100;
}

function fmtPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

function upliftPct(aRate: number, bRate: number): number {
  if (!Number.isFinite(aRate) || aRate <= 0) return 0;
  return ((bRate - aRate) / aRate) * 100;
}

function formatMrrByCurrency(map: Record<string, number> | undefined): string {
  if (!map) return "—";
  const entries = Object.entries(map)
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length < 1) return "—";
  return entries.map(([ccy, v]) => `${ccy} ${Math.floor(v).toLocaleString("ko-KR")}`).join(" | ");
}

function formatMetricsMeta(m: PlatformMetricsDoc | null): string {
  if (!m?.updatedAt?.toDate) return "마지막 갱신: —";
  try {
    const d = m.updatedAt.toDate();
    const time = d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
    const src = m.source ? ` · 기준: ${m.source}` : "";
    return `마지막 갱신: ${time}${src}`;
  } catch {
    return "마지막 갱신: —";
  }
}

export default function AdminHome() {
  const { role, canView, loading: roleLoading, user, debug, isPlatformAdmin } = useRoleGate();
  const [metrics, setMetrics] = useState<PlatformMetricsDoc | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [abSummary, setAbSummary] = useState<AbSummary | null>(null);
  const [abLoading, setAbLoading] = useState(false);
  const [abError, setAbError] = useState<string | null>(null);
  const [abDecision, setAbDecision] = useState<ExperimentDecision | null>(null);
  const [abSummaryDay3, setAbSummaryDay3] = useState<AbSummary | null>(null);
  const [abLoadingDay3, setAbLoadingDay3] = useState(false);
  const [abErrorDay3, setAbErrorDay3] = useState<string | null>(null);
  const [abDecisionDay3, setAbDecisionDay3] = useState<ExperimentDecision | null>(null);
  const arpu = calcArpu(metrics?.totalMRR, metrics?.activeSubscriptions);
  const netRevenue7d = calcNetRevenue("7d", metrics);
  const netRevenue30d = calcNetRevenue("30d", metrics);
  const aRate = ratePct(abSummary?.a.reactivated ?? 0, abSummary?.a.sent ?? 0);
  const bRate = ratePct(abSummary?.b.reactivated ?? 0, abSummary?.b.sent ?? 0);
  const uplift = upliftPct(aRate, bRate);
  const aRateDay3 = ratePct(abSummaryDay3?.a.reactivated ?? 0, abSummaryDay3?.a.sent ?? 0);
  const bRateDay3 = ratePct(abSummaryDay3?.b.reactivated ?? 0, abSummaryDay3?.b.sent ?? 0);
  const upliftDay3 = upliftPct(aRateDay3, bRateDay3);

  useEffect(() => {
    if (!roleLoading && !isPlatformAdmin) {
      setMetricsLoading(false);
      return;
    }
    if (!isPlatformAdmin) return;

    const ref = doc(db, "platformMetrics", "current");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setMetrics(snap.exists() ? (snap.data() as PlatformMetricsDoc) : null);
        setMetricsLoading(false);
      },
      (err) => {
        console.error("[AdminHome] platformMetrics", err);
        setMetricsLoading(false);
        toast.error("운영 지표를 불러오지 못했습니다.");
      }
    );
    return () => unsub();
  }, [isPlatformAdmin, roleLoading]);

  useEffect(() => {
    if (!isPlatformAdmin || roleLoading) return;
    let cancelled = false;
    (async () => {
      setAbLoadingDay3(true);
      setAbErrorDay3(null);
      try {
        const q = query(
          collectionGroup(db, "experiments"),
          where("experimentId", "==", "high_risk_day3_v1")
        );
        const [snap, decisionSnap] = await Promise.all([
          getDocs(q),
          getDoc(doc(db, "experimentDecisions", "high_risk_day3_v1")),
        ]);
        if (cancelled) return;

        const summary: AbSummary = {
          a: emptyCounts(),
          b: emptyCounts(),
          cohortNew: { a: emptyCounts(), b: emptyCounts() },
          cohortExisting: { a: emptyCounts(), b: emptyCounts() },
        };

        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const va = (data.variantA as Record<string, unknown> | undefined) || {};
          const vb = (data.variantB as Record<string, unknown> | undefined) || {};
          summary.a.sent += numOrZero(va.sent);
          summary.a.opened += numOrZero(va.opened);
          summary.a.clicked += numOrZero(va.clicked);
          summary.a.reactivated += numOrZero(va.reactivated);
          summary.b.sent += numOrZero(vb.sent);
          summary.b.opened += numOrZero(vb.opened);
          summary.b.clicked += numOrZero(vb.clicked);
          summary.b.reactivated += numOrZero(vb.reactivated);

          const cohort = (data.cohort as Record<string, unknown> | undefined) || {};
          const cNew = (cohort.new as Record<string, unknown> | undefined) || {};
          const cExisting = (cohort.existing as Record<string, unknown> | undefined) || {};
          summary.cohortNew.a.sent += numOrZero(cNew.sentVariantA);
          summary.cohortNew.b.sent += numOrZero(cNew.sentVariantB);
          summary.cohortNew.a.reactivated += numOrZero(cNew.reactivatedVariantA);
          summary.cohortNew.b.reactivated += numOrZero(cNew.reactivatedVariantB);
          summary.cohortExisting.a.sent += numOrZero(cExisting.sentVariantA);
          summary.cohortExisting.b.sent += numOrZero(cExisting.sentVariantB);
          summary.cohortExisting.a.reactivated += numOrZero(cExisting.reactivatedVariantA);
          summary.cohortExisting.b.reactivated += numOrZero(cExisting.reactivatedVariantB);
        }

        setAbSummaryDay3(summary);
        setAbDecisionDay3(decisionSnap.exists() ? (decisionSnap.data() as ExperimentDecision) : null);
      } catch (e: unknown) {
        if (!cancelled) setAbErrorDay3(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setAbLoadingDay3(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin, roleLoading]);

  useEffect(() => {
    if (!isPlatformAdmin || roleLoading) return;
    let cancelled = false;
    (async () => {
      setAbLoading(true);
      setAbError(null);
      try {
        const q = query(
          collectionGroup(db, "experiments"),
          where("experimentId", "==", "high_risk_day0_v1")
        );
        const [snap, decisionSnap] = await Promise.all([
          getDocs(q),
          getDoc(doc(db, "experimentDecisions", "high_risk_day0_v1")),
        ]);
        if (cancelled) return;

        const summary: AbSummary = {
          a: emptyCounts(),
          b: emptyCounts(),
          cohortNew: { a: emptyCounts(), b: emptyCounts() },
          cohortExisting: { a: emptyCounts(), b: emptyCounts() },
        };

        for (const d of snap.docs) {
          const data = d.data() as Record<string, unknown>;
          const va = (data.variantA as Record<string, unknown> | undefined) || {};
          const vb = (data.variantB as Record<string, unknown> | undefined) || {};
          summary.a.sent += numOrZero(va.sent);
          summary.a.opened += numOrZero(va.opened);
          summary.a.clicked += numOrZero(va.clicked);
          summary.a.reactivated += numOrZero(va.reactivated);
          summary.b.sent += numOrZero(vb.sent);
          summary.b.opened += numOrZero(vb.opened);
          summary.b.clicked += numOrZero(vb.clicked);
          summary.b.reactivated += numOrZero(vb.reactivated);

          const cohort = (data.cohort as Record<string, unknown> | undefined) || {};
          const cNew = (cohort.new as Record<string, unknown> | undefined) || {};
          const cExisting = (cohort.existing as Record<string, unknown> | undefined) || {};
          summary.cohortNew.a.sent += numOrZero(cNew.sentVariantA);
          summary.cohortNew.b.sent += numOrZero(cNew.sentVariantB);
          summary.cohortNew.a.reactivated += numOrZero(cNew.reactivatedVariantA);
          summary.cohortNew.b.reactivated += numOrZero(cNew.reactivatedVariantB);
          summary.cohortExisting.a.sent += numOrZero(cExisting.sentVariantA);
          summary.cohortExisting.b.sent += numOrZero(cExisting.sentVariantB);
          summary.cohortExisting.a.reactivated += numOrZero(cExisting.reactivatedVariantA);
          summary.cohortExisting.b.reactivated += numOrZero(cExisting.reactivatedVariantB);
        }

        setAbSummary(summary);
        setAbDecision(decisionSnap.exists() ? (decisionSnap.data() as ExperimentDecision) : null);
      } catch (e: unknown) {
        if (!cancelled) setAbError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setAbLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin, roleLoading]);

  const runRefresh = async () => {
    if (!isPlatformAdmin) return;
    setRefreshing(true);
    try {
      const fn = httpsCallable(functions, "refreshPlatformMetrics");
      await fn({});
      toast.success("집계를 갱신했습니다.");
    } catch (e: unknown) {
      console.error(e);
      toast.error("집계 갱신에 실패했습니다. Functions 배포·ADMIN 권한을 확인해 주세요.");
    } finally {
      setRefreshing(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <p className="text-center text-gray-500 dark:text-gray-400 py-12">권한 확인 중…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6 flex gap-3 text-red-800 dark:text-red-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <h3 className="font-semibold">접근 권한이 없습니다</h3>
              <p className="text-sm mt-1">관리자 포털은 역할이 부여된 계정만 이용할 수 있습니다.</p>
              <p className="text-xs mt-2 opacity-80">현재 역할: {role}</p>
            </div>
          </CardContent>
        </Card>
        {import.meta.env.DEV && (
          <Card className="mt-4 border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <CardHeader>
              <CardTitle className="text-base">권한 디버그 (DEV)</CardTitle>
              <CardDescription>게스트 판정 원인 추적용 정보</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-amber-900 dark:text-amber-100 space-y-1">
              <p>auth user 존재: {String(!!user)}</p>
              <p>uid: {user.uid}</p>
              <p>email: {user.email ?? "—"}</p>
              <p>projectId: {debug?.projectId ?? "—"}</p>
              <p>claims.admin(cached): {String(debug?.cachedClaims.admin ?? null)}</p>
              <p>claims.role(cached): {debug?.cachedClaims.role ?? "—"}</p>
              <p>claims.admin(forced): {String(debug?.forcedClaims.admin ?? null)}</p>
              <p>claims.role(forced): {debug?.forcedClaims.role ?? "—"}</p>
              <p>forced refresh 성공: {String(debug?.forcedClaims.success ?? false)}</p>
              <p>fallback users/{`{uid}`}.role: {debug?.firestoreFallback.role ?? "—"}</p>
              <p>마지막 에러 코드: {debug?.lastErrorCode ?? "—"}</p>
              <p>마지막 에러 메시지: {debug?.lastErrorMessage ?? "—"}</p>
              <p>최종 반환 role: {debug?.finalRole ?? "—"}</p>
              {debug?.platformAuthority && (
                <>
                  <p className="pt-2 font-medium">platformAuthority (단일 기준)</p>
                  <p>source: {debug.platformAuthority.source}</p>
                  <p>tokenAdmin: {String(debug.platformAuthority.tokenAdmin)}</p>
                  <p>tokenRole: {debug.platformAuthority.tokenRole ?? "—"}</p>
                  <p>firestoreRole: {debug.platformAuthority.firestoreRole ?? "—"}</p>
                  <p>isPlatformAdmin: {String(debug.platformAuthority.isPlatformAdmin)}</p>
                  <p>resolvedPortalRole: {debug.platformAuthority.resolvedPortalRole}</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">관리자 홈</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            핵심 지표와 조치 링크만 모았습니다. 상세 기능은 하단 바로가기 또는 이전 통합 화면으로 이동하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPlatformAdmin && (
            <Button variant="default" disabled={refreshing} onClick={() => void runRefresh()}>
              <RefreshCcw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              지표 새로고침
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/app/admin/legacy-home">이전 통합 화면</Link>
          </Button>
        </div>
      </header>

      {!roleLoading && !isPlatformAdmin && (role === "manager" || role === "viewer") && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6 flex gap-3 text-amber-900 dark:text-amber-100">
            <Shield className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">
                플랫폼 KPI·실험 집계는 포털 역할 <code className="text-xs">admin</code> 과 동일한 기준(
                <code className="text-xs">admin</code> 클레임 / <code className="text-xs">users.role</code>{" "}
                ADMIN 등)으로만 열립니다.
              </p>
              <p className="text-sm mt-1 opacity-90">
                매니저·뷰어는 읽기 전용으로 아래 운영 도구·이전 통합 화면만 이용하세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isPlatformAdmin && (
        <>
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              운영 지표
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{formatMetricsMeta(metrics)}</p>
            {metricsLoading ? (
              <p className="text-sm text-gray-500">불러오는 중…</p>
            ) : !metrics ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-gray-600 dark:text-gray-300">
                  아직 집계 데이터가 없습니다. 상단 <strong>지표 새로고침</strong>을 눌러{" "}
                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">platformMetrics/current</code>를
                  생성하세요.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi title="협회 수" value={num(metrics.totalFederations)} />
                <Kpi title="팀 수" value={num(metrics.totalTeams)} />
                <Kpi title="멤버 수 합" subtitle="teams.memberCount" value={num(metrics.totalMembers)} />
                <Kpi title="정상 결제 팀" subtitle="active / trialing" value={num(metrics.billingHealthyTeams)} />
                <Kpi
                  title="MRR 합"
                  subtitle="active·trialing mrr 합(Stripe minor, 통화 혼합 가능)"
                  value={num(metrics.totalMRR)}
                />
                <Kpi
                  title="MRR 통화별"
                  subtitle="totalMRRByCurrency"
                  value={formatMrrByCurrency(metrics.totalMRRByCurrency)}
                />
                <Kpi
                  title="활성 구독 수"
                  subtitle="active·trialing + stripeSubscriptionId"
                  value={num(metrics.activeSubscriptions)}
                />
                <Kpi title="ARPU" subtitle="totalMRR / activeSubscriptions" value={num(arpu)} />
                <Kpi title="Net Revenue(7일)" subtitle="conversion + recovery - churn" value={num(netRevenue7d)} />
                <Kpi
                  title="Net Revenue(30일)"
                  subtitle="conversion + recovery - churn"
                  value={num(netRevenue30d)}
                />
                <Kpi title="이탈(7일)" subtitle="churn rollup" value={num(metrics.churnedSubscriptions7d)} />
                <Kpi title="이탈(30일)" subtitle="churn rollup" value={num(metrics.churnedSubscriptions30d)} />
                <Kpi title="Trial→Paid(7일)" subtitle="conversion rollup" value={num(metrics.trialToPaidConversions7d)} />
                <Kpi
                  title="Trial→Paid(30일)"
                  subtitle="conversion rollup"
                  value={num(metrics.trialToPaidConversions30d)}
                />
                <Kpi title="past_due" subtitle="결제 실패" value={num(metrics.pastDueTeams)} accent="danger" />
                <Kpi title="restricted" subtitle="유예 종료·부분 제한" value={num(metrics.restrictedTeams)} accent="danger" />
                <Kpi
                  title="빌링 복구(누적)"
                  subtitle="restricted → 결제 정상"
                  value={num(metrics.recentRecoveredBillingTeams)}
                />
                <Kpi title="빌링 복구(7일)" subtitle="rollup 스케줄" value={num(metrics.recentRecoveredBillingTeams7d)} />
                <Kpi title="빌링 복구(30일)" subtitle="rollup 스케줄" value={num(metrics.recentRecoveredBillingTeams30d)} />
                <Kpi title="7일 내 활동 팀" subtitle="updatedAt" value={num(metrics.activeTeams7d)} />
                <Kpi title="7일+ 미활동" subtitle="updatedAt" value={num(metrics.inactiveTeams7d)} />
                <Kpi title="30일 내 활동 팀" subtitle="full_rebuild 기준" value={num(metrics.activeTeams30d)} />
                <Kpi title="30일+ 미활동" subtitle="full_rebuild 기준" value={num(metrics.inactiveTeams30d)} />
                <Kpi title="고위험 Day0" subtitle="inactive+past_due 첫 감지" value={num(metrics.highRiskDay0Teams)} />
                <Kpi title="고위험 Day3" subtitle="고위험 재알림 단계" value={num(metrics.highRiskDay3Teams)} />
                <Kpi title="고위험 Day7" subtitle="restricted+inactive 단계" value={num(metrics.highRiskDay7Teams)} />
                <Kpi title="Free 플랜 팀" subtitle="업셀 풀" value={num(metrics.freeTeams)} />
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              지금 할 일
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <ActionCard
                title="결제 실패 팀"
                count={metrics?.pastDueTeams}
                href="/app/admin/org-billing?from=admin-home&focus=past_due"
                hint="조직·빌링에서 past_due 대응"
              />
              <ActionCard
                title="제한된 팀"
                count={metrics?.restrictedTeams}
                href="/app/admin/org-billing?from=admin-home&focus=restricted"
                hint="billingRestricted · 회비 생성 등 제한"
              />
              <ActionCard
                title="장기 비활성 팀"
                count={metrics?.inactiveTeams30d}
                href="/app/admin/team-trends?from=admin-home&focus=inactive_30d"
                hint="30일 이상 updatedAt 없음 (full_rebuild)"
              />
              <ActionCard
                title="고위험 팀"
                count={metrics?.highRiskTeams}
                href="/app/admin/org-billing?from=admin-home&focus=high_risk"
                hint="inactive + past_due"
              />
            </div>
            {(metrics?.pastDueTeamIds?.length ||
              metrics?.restrictedTeamIds?.length ||
              metrics?.highRiskTeamIds?.length ||
              metrics?.inactiveTeamIds?.length) ? (
              <div className="mt-4 grid md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                {metrics.pastDueTeamIds && metrics.pastDueTeamIds.length > 0 && (
                  <TeamIdList label="past_due 샘플" ids={metrics.pastDueTeamIds} />
                )}
                {metrics.restrictedTeamIds && metrics.restrictedTeamIds.length > 0 && (
                  <TeamIdList label="restricted 샘플" ids={metrics.restrictedTeamIds} />
                )}
                {metrics.highRiskTeamIds && metrics.highRiskTeamIds.length > 0 && (
                  <TeamIdList label="고위험 샘플(inactive+past_due)" ids={metrics.highRiskTeamIds} />
                )}
                {metrics.inactiveTeamIds && metrics.inactiveTeamIds.length > 0 && (
                  <TeamIdList label="비활성 샘플" ids={metrics.inactiveTeamIds} />
                )}
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              High Risk Day0 A/B
            </h2>
            {abLoading ? (
              <p className="text-sm text-gray-500">실험 집계 불러오는 중…</p>
            ) : abError ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">실험 집계를 읽지 못했습니다: {abError}</p>
            ) : !abSummary ? (
              <p className="text-sm text-gray-500">실험 데이터가 없습니다.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-3">
                <Kpi
                  title="실험 상태"
                  subtitle={`표본 A ${num(abDecision?.sampleSize?.A)} / B ${num(abDecision?.sampleSize?.B)}`}
                  value={
                    abDecision?.winner
                      ? `${abDecision.status || "decided"} · winner ${abDecision.winner} (${abDecision.rollout || "full"})`
                      : abDecision?.status || "running"
                  }
                />
                <Kpi title="Variant A 복귀율" subtitle={`reactivated ${num(abSummary.a.reactivated)} / sent ${num(abSummary.a.sent)}`} value={fmtPct(aRate)} />
                <Kpi title="Variant B 복귀율" subtitle={`reactivated ${num(abSummary.b.reactivated)} / sent ${num(abSummary.b.sent)}`} value={fmtPct(bRate)} />
                <Kpi title="Uplift (B vs A)" subtitle="(B_rate - A_rate) / A_rate" value={fmtPct(uplift)} accent={uplift >= 0 ? undefined : "danger"} />
                <Kpi
                  title="New Cohort"
                  subtitle={`A ${num(abSummary.cohortNew.a.reactivated)}/${num(abSummary.cohortNew.a.sent)} · B ${num(abSummary.cohortNew.b.reactivated)}/${num(abSummary.cohortNew.b.sent)}`}
                  value={`A ${fmtPct(ratePct(abSummary.cohortNew.a.reactivated, abSummary.cohortNew.a.sent))} · B ${fmtPct(ratePct(abSummary.cohortNew.b.reactivated, abSummary.cohortNew.b.sent))}`}
                />
                <Kpi
                  title="Existing Cohort"
                  subtitle={`A ${num(abSummary.cohortExisting.a.reactivated)}/${num(abSummary.cohortExisting.a.sent)} · B ${num(abSummary.cohortExisting.b.reactivated)}/${num(abSummary.cohortExisting.b.sent)}`}
                  value={`A ${fmtPct(ratePct(abSummary.cohortExisting.a.reactivated, abSummary.cohortExisting.a.sent))} · B ${fmtPct(ratePct(abSummary.cohortExisting.b.reactivated, abSummary.cohortExisting.b.sent))}`}
                />
                <Kpi
                  title="퍼널"
                  subtitle="A/B sent→opened→clicked→reactivated"
                  value={`A ${num(abSummary.a.sent)}→${num(abSummary.a.opened)}→${num(abSummary.a.clicked)}→${num(abSummary.a.reactivated)} | B ${num(abSummary.b.sent)}→${num(abSummary.b.opened)}→${num(abSummary.b.clicked)}→${num(abSummary.b.reactivated)}`}
                />
              </div>
            )}
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              High Risk Day3 A/B
            </h2>
            {abLoadingDay3 ? (
              <p className="text-sm text-gray-500">실험 집계 불러오는 중…</p>
            ) : abErrorDay3 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">실험 집계를 읽지 못했습니다: {abErrorDay3}</p>
            ) : !abSummaryDay3 ? (
              <p className="text-sm text-gray-500">실험 데이터가 없습니다.</p>
            ) : (
              <div className="grid md:grid-cols-3 gap-3">
                <Kpi
                  title="실험 상태"
                  subtitle={`표본 A ${num(abDecisionDay3?.sampleSize?.A)} / B ${num(abDecisionDay3?.sampleSize?.B)}`}
                  value={
                    abDecisionDay3?.winner
                      ? `${abDecisionDay3.status || "decided"} · winner ${abDecisionDay3.winner} (${abDecisionDay3.rollout || "full"})`
                      : abDecisionDay3?.status || "running"
                  }
                />
                <Kpi title="Variant A 복귀율" subtitle={`reactivated ${num(abSummaryDay3.a.reactivated)} / sent ${num(abSummaryDay3.a.sent)}`} value={fmtPct(aRateDay3)} />
                <Kpi title="Variant B 복귀율" subtitle={`reactivated ${num(abSummaryDay3.b.reactivated)} / sent ${num(abSummaryDay3.b.sent)}`} value={fmtPct(bRateDay3)} />
                <Kpi title="Uplift (B vs A)" subtitle="(B_rate - A_rate) / A_rate" value={fmtPct(upliftDay3)} accent={upliftDay3 >= 0 ? undefined : "danger"} />
                <Kpi
                  title="New Cohort"
                  subtitle={`A ${num(abSummaryDay3.cohortNew.a.reactivated)}/${num(abSummaryDay3.cohortNew.a.sent)} · B ${num(abSummaryDay3.cohortNew.b.reactivated)}/${num(abSummaryDay3.cohortNew.b.sent)}`}
                  value={`A ${fmtPct(ratePct(abSummaryDay3.cohortNew.a.reactivated, abSummaryDay3.cohortNew.a.sent))} · B ${fmtPct(ratePct(abSummaryDay3.cohortNew.b.reactivated, abSummaryDay3.cohortNew.b.sent))}`}
                />
                <Kpi
                  title="Existing Cohort"
                  subtitle={`A ${num(abSummaryDay3.cohortExisting.a.reactivated)}/${num(abSummaryDay3.cohortExisting.a.sent)} · B ${num(abSummaryDay3.cohortExisting.b.reactivated)}/${num(abSummaryDay3.cohortExisting.b.sent)}`}
                  value={`A ${fmtPct(ratePct(abSummaryDay3.cohortExisting.a.reactivated, abSummaryDay3.cohortExisting.a.sent))} · B ${fmtPct(ratePct(abSummaryDay3.cohortExisting.b.reactivated, abSummaryDay3.cohortExisting.b.sent))}`}
                />
                <Kpi
                  title="퍼널"
                  subtitle="A/B sent→opened→clicked→reactivated"
                  value={`A ${num(abSummaryDay3.a.sent)}→${num(abSummaryDay3.a.opened)}→${num(abSummaryDay3.a.clicked)}→${num(abSummaryDay3.a.reactivated)} | B ${num(abSummaryDay3.b.sent)}→${num(abSummaryDay3.b.opened)}→${num(abSummaryDay3.b.clicked)}→${num(abSummaryDay3.b.reactivated)}`}
                />
              </div>
            )}
          </section>
        </>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          운영 도구
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Tool href="/app/dashboard" icon={<LineChart className="h-4 w-4" />} title="상세 대시보드" desc="로그·차트" />
          <Tool href="/admin/reports" icon={<BarChart3 className="h-4 w-4" />} title="리포트" desc="/admin/reports" />
          <Tool href="/app/admin/console" icon={<Wrench className="h-4 w-4" />} title="관리자 콘솔" desc="운영 도구" />
          <Tool href="/app/admin/org-billing" icon={<CreditCard className="h-4 w-4" />} title="조직·결제" desc="빌링 센터" />
          <Tool
            href="/admin/billing-analytics"
            icon={<TrendingUp className="h-4 w-4" />}
            title="Billing Analytics"
            desc="MRR·구독 추이"
          />
          <Tool
            href="/admin/billing-cohort"
            icon={<Users className="h-4 w-4" />}
            title="Billing Cohort"
            desc="리텐션·코호트"
          />
          <Tool href="/app/admin/growth-console" icon={<Sparkles className="h-4 w-4" />} title="성장 콘솔" desc="그로스" />
          <Tool href="/app/admin/sre-dashboard" icon={<Shield className="h-4 w-4" />} title="SRE" desc="안정성" />
        </div>
      </section>

      <p className="text-[11px] text-center text-gray-400">
        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">refreshPlatformMetrics</code> 수동·6시간 스케줄이{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">full_rebuild</code>를 쓰고, 팀 문서 변경 시{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">incremental</code>이 보조합니다. `updatedAt` 백필:{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm run backfill:team-updated-at -- --dry-run</code>{" "}
        (실행 전 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">--prod</code> 옵션 확인)
      </p>

      {import.meta.env.DEV && debug?.platformAuthority && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">권한 디버그 (DEV) — platformAuthority</CardTitle>
            <CardDescription className="text-xs">
              users.role 저장은 ADMIN/USER 권장 · claims.role 은 admin/manager/viewer · 판정은{" "}
              <code className="text-[10px]">src/lib/platformRole.ts</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-1 font-mono text-amber-950 dark:text-amber-100">
            <p>role: {role}</p>
            <p>isPlatformAdmin: {String(isPlatformAdmin)}</p>
            <p>source: {debug.platformAuthority.source}</p>
            <p>tokenAdmin: {String(debug.platformAuthority.tokenAdmin)}</p>
            <p>tokenRole: {debug.platformAuthority.tokenRole ?? "—"}</p>
            <p>firestoreRole: {debug.platformAuthority.firestoreRole ?? "—"}</p>
            <p>resolvedPortalRole: {debug.platformAuthority.resolvedPortalRole}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accent?: "danger";
}) {
  return (
    <div
      className={`rounded-xl border p-4 bg-white dark:bg-gray-900 ${
        accent === "danger"
          ? "border-red-200 dark:border-red-900"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
      {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      <p
        className={`text-2xl font-semibold mt-1 ${
          accent === "danger" ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionCard({
  title,
  count,
  href,
  hint,
}: {
  title: string;
  count?: number;
  href: string;
  hint: string;
}) {
  return (
    <Card className="border-gray-200 dark:border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          {title}
          <span className="text-sm font-normal text-gray-500">{typeof count === "number" ? count : "—"}건</span>
        </CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="secondary" className="w-full" asChild>
          <Link to={href}>
            확인하기 <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function Tool({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={href}
      className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <div className="mt-0.5 text-blue-600 dark:text-blue-400">{icon}</div>
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

function TeamIdList({ label, ids }: { label: string; ids: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
      <p className="font-medium text-gray-700 dark:text-gray-200 mb-2">{label}</p>
      <ul className="space-y-1 max-h-28 overflow-y-auto">
        {ids.map((id) => (
          <li key={id}>
            <Link className="text-blue-600 hover:underline" to={`/team/${encodeURIComponent(id)}?tab=home`}>
              {id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
