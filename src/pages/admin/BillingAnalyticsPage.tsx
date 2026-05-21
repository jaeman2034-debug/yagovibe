import { Link, Navigate, useLocation } from "react-router-dom";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ArrowLeft, BarChart3, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useRoleGate } from "@/hooks/useRoleGate";
import { useBillingMetrics, type BillingMetricRow } from "@/hooks/useBillingMetrics";
import { cn } from "@/lib/utils";

const nf = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

/** 집계 문서 `date`·스케줄러 `seoulYmd`와 동일 — 표시는 항상 서울 달력 기준 */
const BILLING_DISPLAY_TZ = "Asia/Seoul";

/**
 * `YYYY-MM-DD` 문자열을 **해당 일의 서울 자정**으로 해석 (브라우저 로캘·해외 접속과 무관하게 동일 표시)
 */
function parseBillingYmdSeoul(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const iso = `${m[1]}-${m[2]}-${m[3]}T00:00:00+09:00`;
    const dt = new Date(iso);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

/** 툴팁: "4월 23일" */
function formatBillingDateTooltip(ymd: string): string {
    const dt = parseBillingYmdSeoul(ymd);
    if (!dt) return ymd;
    return dt.toLocaleDateString("ko-KR", {
        timeZone: BILLING_DISPLAY_TZ,
        month: "long",
        day: "numeric",
    });
}

/** KPI: 연도 포함 가독성 */
function formatBillingDateKpi(ymd: string): string {
    const dt = parseBillingYmdSeoul(ymd);
    if (!dt) return ymd;
    return dt.toLocaleDateString("ko-KR", {
        timeZone: BILLING_DISPLAY_TZ,
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/** X축 틱: 짧게 */
function formatBillingDateAxis(ymd: string): string {
    const dt = parseBillingYmdSeoul(ymd);
    if (!dt) return ymd;
    return dt.toLocaleDateString("ko-KR", {
        timeZone: BILLING_DISPLAY_TZ,
        month: "numeric",
        day: "numeric",
    });
}

function formatMrr(n: number) {
    return nf.format(Math.round(n));
}

/** 전일 대비. `invertGood`: 값이 줄수록 좋음(예: Churn) */
function DeltaFromPrev({
    label,
    current,
    previous,
    mode,
    invertGood,
}: {
    label: string;
    current: number;
    previous: number | undefined;
    mode: "mrr" | "int";
    invertGood?: boolean;
}) {
    if (previous === undefined) {
        return <p className="text-xs text-muted-foreground">{label} —</p>;
    }
    const raw = current - previous;
    if (raw === 0) {
        return <p className="text-xs text-muted-foreground">{label} ±0</p>;
    }
    const good = invertGood ? raw < 0 : raw > 0;
    const absFmt = mode === "mrr" ? formatMrr(Math.abs(raw)) : nf.format(Math.abs(raw));
    const sign = raw > 0 ? "+" : "−";
    return (
        <p
            className={cn(
                "text-xs font-medium tabular-nums",
                good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}
        >
            {label} {sign}
            {absFmt}
        </p>
    );
}

function KpiCards({
    latest,
    prev,
    monthChurn,
}: {
    latest: BillingMetricRow;
    prev: BillingMetricRow | undefined;
    monthChurn: number;
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>MRR (활성만)</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{formatMrr(latest.mrr)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-muted-foreground">
                    <DeltaFromPrev label="전일 대비" current={latest.mrr} previous={prev?.mrr} mode="mrr" />
                    <p className="text-xs">일자 스냅샷 · Stripe 단위 합산</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Active 구독</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{nf.format(latest.activeCount)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-muted-foreground">
                    <DeltaFromPrev
                        label="전일 대비"
                        current={latest.activeCount}
                        previous={prev?.activeCount}
                        mode="int"
                    />
                    <p className="text-xs">status = active</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Churn (이번 달)</CardDescription>
                    <CardTitle className="text-2xl tabular-nums">{nf.format(monthChurn)}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-muted-foreground">
                    <DeltaFromPrev
                        label="전일 대비"
                        current={typeof latest.churnEventsDay === "number" ? latest.churnEventsDay : 0}
                        previous={typeof prev?.churnEventsDay === "number" ? prev.churnEventsDay : undefined}
                        mode="int"
                        invertGood
                    />
                    <p className="text-xs">`subscription_events` 월 누적 (서울일 기준)</p>
                </CardContent>
            </Card>
        </div>
    );
}

function BillingEmptyState({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
    return (
        <Card className="border-dashed">
            <CardHeader className="text-center sm:text-left">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted sm:mx-0">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
                <CardTitle className="pt-2 text-lg">아직 빌링 집계가 없습니다</CardTitle>
                <CardDescription className="text-pretty max-w-lg">
                    `billing_metrics_daily`에 문서가 없습니다. Cloud Function{" "}
                    <code className="rounded bg-muted px-1 text-[11px]">billingMetricsDaily</code> (매일 02:00 KST)가
                    돌아야 차트가 채워집니다. 배포 직후에는 Firebase 콘솔에서 해당 스케줄 함수를 한 번 수동 실행해
                    보세요.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    다시 불러오기
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                    <Link to="/app/admin/org-billing">조직 빌링 센터</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function MRRChart({ data }: { data: BillingMetricRow[] }) {
    return (
        <Card className="min-h-[320px]">
            <CardHeader>
                <CardTitle className="text-base">MRR 추이</CardTitle>
                <CardDescription>최근 {data.length}일 · 일별 집계</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                            tickFormatter={(v) => formatBillingDateAxis(String(v))}
                        />
                        <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={(v) => nf.format(Number(v))} />
                        <Tooltip
                            formatter={(value: number | string) => [formatMrr(Number(value)), "MRR"]}
                            labelFormatter={(l) => formatBillingDateTooltip(String(l))}
                        />
                        <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function ActiveChart({ data }: { data: BillingMetricRow[] }) {
    return (
        <Card className="min-h-[320px]">
            <CardHeader>
                <CardTitle className="text-base">Active 구독 수</CardTitle>
                <CardDescription>최근 {data.length}일</CardDescription>
            </CardHeader>
            <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                            tickFormatter={(v) => formatBillingDateAxis(String(v))}
                        />
                        <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                        <Tooltip
                            formatter={(v: number | string) => [nf.format(Number(v)), "Active"]}
                            labelFormatter={(l) => formatBillingDateTooltip(String(l))}
                        />
                        <Line
                            type="monotone"
                            dataKey="activeCount"
                            stroke="hsl(142 76% 36%)"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function GrowthChart({ data }: { data: BillingMetricRow[] }) {
    const chartData = data.map((d) => ({
        ...d,
        churnEventsDayNum: typeof d.churnEventsDay === "number" ? d.churnEventsDay : 0,
    }));
    return (
        <Card className="min-h-[340px]">
            <CardHeader>
                <CardTitle className="text-base">성장 vs 이탈</CardTitle>
                <CardDescription>
                    New·Churn(롤링)·해지(당일·이벤트) · 최근 {data.length}일
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                            tickFormatter={(v) => formatBillingDateAxis(String(v))}
                        />
                        <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                        <Tooltip labelFormatter={(l) => formatBillingDateTooltip(String(l))} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="newCount" name="New (30d)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="churnCount" name="Churn (30d)" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                        <Bar
                            dataKey="churnEventsDayNum"
                            name="해지(당일)"
                            fill="hsl(280 65% 48%)"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

/**
 * 플랫폼 빌링 분석 — `billing_metrics_daily` 시계열
 * Canonical: `/admin/billing-analytics` — `/app/admin/billing-analytics` 는 리다이렉트
 */
export default function BillingAnalyticsPage() {
    const location = useLocation();
    const { user: authUser, loading: authLoading } = useAuth();
    const { isPlatformAdmin, loading: platformRoleLoading } = useRoleGate();

    /** `billing_metrics_daily` Rules(`isGlobalAdmin`)과 동일 */
    const hasPermission = () => {
        if (platformRoleLoading) return false;
        if (!authUser) return false;
        if (isPlatformAdmin) return true;
        if (authUser.email?.includes("admin") || authUser.email?.includes("@yagovibe.com")) {
            return true;
        }
        return false;
    };

    const canLoad = Boolean(authUser) && hasPermission();
    const { data, loading, error, refetch } = useBillingMetrics(canLoad);

    const latest = data.length > 0 ? data[data.length - 1] : undefined;
    const prev = data.length > 1 ? data[data.length - 2] : undefined;
    /** 북마크·공유는 `/admin/billing-analytics` 기준 */
    const adminHomeHref = "/admin";

    if (authLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center p-6">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" aria-label="로딩" />
            </div>
        );
    }

    if (!authUser) {
        const next = `${location.pathname}${location.search}`;
        return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
    }

    if (platformRoleLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center p-6">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" aria-label="권한 확인" />
            </div>
        );
    }

    if (!hasPermission()) {
        return <Navigate to="/app/admin/home" replace />;
    }

    const hasSeries = data.length > 0;
    const currentMonth = new Date().toLocaleDateString("en-CA", { timeZone: BILLING_DISPLAY_TZ }).slice(0, 7);
    const monthChurn = data.reduce((sum, row) => {
        if (!String(row.date).startsWith(currentMonth)) return sum;
        return sum + (typeof row.churnEventsDay === "number" ? row.churnEventsDay : 0);
    }, 0);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
                        <Link to={adminHomeHref}>
                            <ArrowLeft className="h-4 w-4" />
                            관리 홈
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Billing Analytics</h1>
                    <p className="text-sm text-muted-foreground">
                        전역 MRR·구독 추이 ·{" "}
                        <Link to="/app/admin/org-billing" className="underline underline-offset-2">
                            조직 빌링 센터
                        </Link>
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {error ? (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-base text-destructive">데이터를 불러오지 못했습니다</CardTitle>
                        <CardDescription>
                            Firestore 규칙상 플랫폼 관리자만 `billing_metrics_daily`를 읽을 수 있습니다. ({error})
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            {!loading && !error && !hasSeries ? <BillingEmptyState onRetry={refetch} loading={loading} /> : null}

            {hasSeries && latest ? (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        최신 집계일{" "}
                        <span className="font-medium text-foreground">{formatBillingDateKpi(latest.date)}</span>
                        {prev ? (
                            <>
                                {" "}
                                · 전일{" "}
                                <span className="font-medium text-foreground">
                                    {formatBillingDateTooltip(prev.date)}
                                </span>
                            </>
                        ) : null}
                    </p>
                    <KpiCards latest={latest} prev={prev} monthChurn={monthChurn} />
                </div>
            ) : null}

            {hasSeries ? (
                <>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <MRRChart data={data} />
                        <ActiveChart data={data} />
                    </div>
                    <GrowthChart data={data} />
                </>
            ) : null}
        </div>
    );
}
