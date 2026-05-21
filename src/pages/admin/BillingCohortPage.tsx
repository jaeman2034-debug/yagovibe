import { useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ArrowLeft, RefreshCw, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useRoleGate } from "@/hooks/useRoleGate";
import { useSubscriptionEvents, type SubscriptionEventRow } from "@/hooks/useSubscriptionEvents";
import { cn } from "@/lib/utils";

const COHORT_TZ = "Asia/Seoul";
const CHECKPOINTS = [0, 1, 3, 7, 14, 30] as const;
const PERIOD_OPTIONS = [
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "180d", days: 180 },
] as const;
const MIN_COHORT_OPTIONS = [0, 5, 10, 20] as const;

type CohortRow = {
    cohortDate: string;
    size: number;
    byDay: Record<number, number>;
};

type CurvePoint = { day: number; retention: number };
type FunnelStats = {
    trialCount: number;
    activatedCount: number;
    retained7Count: number;
    churnCount: number;
    activationRate: number;
    retained7Rate: number;
    churnRate: number;
};
type BuildOptions = { periodDays: number; minCohortSize: number };
type OrgRetentionVector = {
    cohortDate: string;
    aliveByDay: number[];
    activated: boolean;
    churnedAfterActivated: boolean;
};

function ymdFromMsKst(ms: number): string {
    return new Date(ms).toLocaleDateString("en-CA", { timeZone: COHORT_TZ });
}

function ymdLabelKst(ymd: string): string {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return ymd;
    return new Date(`${ymd}T00:00:00+09:00`).toLocaleDateString("ko-KR", {
        timeZone: COHORT_TZ,
        year: "2-digit",
        month: "numeric",
        day: "numeric",
    });
}

function ymdToStartMsKst(ymd: string): number {
    return new Date(`${ymd}T00:00:00+09:00`).getTime();
}

function addDaysYmdKst(ymd: string, days: number): string {
    const ms = ymdToStartMsKst(ymd) + days * 24 * 60 * 60 * 1000;
    return ymdFromMsKst(ms);
}

function retentionRateClass(rate: number): string {
    if (rate >= 90) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
    if (rate >= 70) return "bg-emerald-400/15 text-emerald-700 dark:text-emerald-300";
    if (rate >= 50) return "bg-amber-400/20 text-amber-700 dark:text-amber-300";
    if (rate >= 30) return "bg-orange-400/20 text-orange-700 dark:text-orange-300";
    return "bg-red-500/20 text-red-700 dark:text-red-300";
}

function buildCohortAndCurve(events: SubscriptionEventRow[], options: BuildOptions): {
    rows: CohortRow[];
    curve: CurvePoint[];
    totalOrgs: number;
    funnel: FunnelStats;
} {
    const cutoffMs = Date.now() - options.periodDays * 24 * 60 * 60 * 1000;
    const orgMap = new Map<string, SubscriptionEventRow[]>();
    for (const e of events) {
        if (!e.orgId) continue;
        if (e.type !== "trial_started" && e.type !== "canceled" && e.type !== "activated") continue;
        const key = String(e.orgId);
        const arr = orgMap.get(key) ?? [];
        arr.push(e);
        orgMap.set(key, arr);
    }

    const orgVectors: OrgRetentionVector[] = [];

    for (const [, evs] of orgMap) {
        evs.sort((a, b) => a.occurredAtMs - b.occurredAtMs);
        const trial = evs.find((e) => e.type === "trial_started");
        if (!trial) continue;
        if (trial.occurredAtMs < cutoffMs) continue;
        const cohortDate = ymdFromMsKst(trial.occurredAtMs);
        const timeline = evs.filter(
            (e) =>
                e.occurredAtMs >= trial.occurredAtMs &&
                (e.type === "trial_started" || e.type === "activated" || e.type === "canceled")
        );
        const firstActivated = timeline.find((e) => e.type === "activated");
        const activatedMs = firstActivated?.occurredAtMs ?? null;
        const churnedAfterActivated =
            activatedMs != null && timeline.some((e) => e.type === "canceled" && e.occurredAtMs >= activatedMs);

        // MVP+: canceled 후라도 activated가 다시 오면 생존(1)으로 복귀
        const aliveByDay: number[] = [];
        let idx = 0;
        let alive = 1;
        for (let d = 0; d <= 30; d++) {
            const dayStartMs = ymdToStartMsKst(addDaysYmdKst(cohortDate, d));
            while (idx < timeline.length && timeline[idx].occurredAtMs <= dayStartMs) {
                const t = timeline[idx].type;
                if (t === "canceled") alive = 0;
                if (t === "activated" || t === "trial_started") alive = 1;
                idx += 1;
            }
            aliveByDay.push(alive);
        }
        orgVectors.push({
            cohortDate,
            aliveByDay,
            activated: activatedMs != null,
            churnedAfterActivated,
        });
    }

    const cohortVectors = new Map<string, OrgRetentionVector[]>();
    for (const ov of orgVectors) {
        const list = cohortVectors.get(ov.cohortDate) ?? [];
        list.push(ov);
        cohortVectors.set(ov.cohortDate, list);
    }

    const keptEntries = Array.from(cohortVectors.entries()).filter(
        ([, vectors]) => vectors.length >= options.minCohortSize
    );

    const rows: CohortRow[] = keptEntries
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([cohortDate, vectors]) => {
            const size = vectors.length;
            const byDay: Record<number, number> = {};
            for (const day of CHECKPOINTS) {
                const alive = vectors.reduce((sum, v) => sum + (v.aliveByDay[day] ?? 0), 0);
                byDay[day] = size > 0 ? (alive / size) * 100 : 0;
            }
            return { cohortDate, size, byDay };
        });

    const allVectors = keptEntries.flatMap(([, vectors]) => vectors);

    const curve: CurvePoint[] = [];
    for (let day = 0; day <= 30; day++) {
        const alive = allVectors.reduce((sum, v) => sum + (v.aliveByDay[day] ?? 0), 0);
        const retention = allVectors.length > 0 ? (alive / allVectors.length) * 100 : 0;
        curve.push({ day, retention });
    }

    const trialCount = allVectors.length;
    const activatedCount = allVectors.filter((v) => v.activated).length;
    const retained7Count = allVectors.filter((v) => v.aliveByDay[7] === 1).length;
    const churnCount = allVectors.filter((v) => v.churnedAfterActivated).length;

    const funnel: FunnelStats = {
        trialCount,
        activatedCount,
        retained7Count,
        churnCount,
        activationRate: trialCount > 0 ? (activatedCount / trialCount) * 100 : 0,
        retained7Rate: trialCount > 0 ? (retained7Count / trialCount) * 100 : 0,
        churnRate: activatedCount > 0 ? (churnCount / activatedCount) * 100 : 0,
    };

    return { rows, curve, totalOrgs: trialCount, funnel };
}

function FunnelSection({ funnel }: { funnel: FunnelStats }) {
    const chartData = [
        { stage: "Trial", value: funnel.trialCount },
        { stage: "Activated", value: funnel.activatedCount },
        { stage: "Retained D7", value: funnel.retained7Count },
        { stage: "Churn", value: funnel.churnCount },
    ];
    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Trial</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">{funnel.trialCount}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Activated</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">
                            {funnel.activatedCount} ({funnel.activationRate.toFixed(1)}%)
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Retained D7</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">
                            {funnel.retained7Count} ({funnel.retained7Rate.toFixed(1)}%)
                        </CardTitle>
                        <CardDescription className="text-[11px]">of Trial</CardDescription>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Churn</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">
                            {funnel.churnCount} ({funnel.churnRate.toFixed(1)}%)
                        </CardTitle>
                        <CardDescription className="text-[11px]">of Activated</CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <Card className="min-h-[300px]">
                <CardHeader>
                    <CardTitle className="text-base">Funnel</CardTitle>
                    <CardDescription>Trial → Activated → Retained D7 → Churn</CardDescription>
                </CardHeader>
                <CardContent className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

function CohortTable({ rows }: { rows: CohortRow[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Cohort Table</CardTitle>
                <CardDescription>
                    `trial_started`를 코호트 기준으로 계산한 유지율 (Size 포함, 재활성화 반영)
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-border text-muted-foreground">
                            <th className="px-3 py-2 text-left font-medium">Cohort</th>
                            <th className="px-3 py-2 text-right font-medium">Size</th>
                            {CHECKPOINTS.map((day) => (
                                <th key={day} className="px-2 py-2 text-right font-medium">
                                    D{day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.cohortDate} className="border-b border-border/60">
                                <td className="px-3 py-2 font-medium">{ymdLabelKst(r.cohortDate)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{r.size}</td>
                                {CHECKPOINTS.map((day) => {
                                    const rate = r.byDay[day] ?? 0;
                                    return (
                                        <td key={day} className="px-2 py-2 text-right">
                                            <span
                                                className={cn(
                                                    "inline-block rounded px-2 py-1 tabular-nums",
                                                    retentionRateClass(rate)
                                                )}
                                            >
                                                {rate.toFixed(1)}%
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

function RetentionCurve({ data }: { data: CurvePoint[] }) {
    return (
        <Card className="min-h-[340px]">
            <CardHeader>
                <CardTitle className="text-base">Retention Curve (D0~D30)</CardTitle>
                <CardDescription>전체 코호트 평균 생존율</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            width={44}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${Number(v)}%`}
                        />
                        <Tooltip formatter={(v: number | string) => [`${Number(v).toFixed(1)}%`, "Retention"]} />
                        <Line type="monotone" dataKey="retention" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default function BillingCohortPage() {
    const location = useLocation();
    const { user: authUser, loading: authLoading } = useAuth();
    const { isPlatformAdmin, loading: platformRoleLoading } = useRoleGate();

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
    const { data, loading, error, refetch } = useSubscriptionEvents(canLoad);
    const [periodDays, setPeriodDays] = useState<number>(90);
    const [minCohortSize, setMinCohortSize] = useState<number>(10);
    const { rows, curve, totalOrgs, funnel } = useMemo(
        () => buildCohortAndCurve(data, { periodDays, minCohortSize }),
        [data, minCohortSize, periodDays]
    );

    if (authLoading || platformRoleLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center p-6">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    if (!authUser) {
        const next = `${location.pathname}${location.search}`;
        return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
    }
    if (!hasPermission()) {
        return <Navigate to="/app/admin/home" replace />;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
                        <Link to="/admin">
                            <ArrowLeft className="h-4 w-4" />
                            관리 홈
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Billing Cohort & Retention</h1>
                    <p className="text-sm text-muted-foreground">
                        코호트 기준: <code className="rounded bg-muted px-1 text-[11px]">trial_started</code> (KST)
                    </p>
                    <p className="text-xs text-muted-foreground">
                        기간 {periodDays}일 · 최소 코호트 {minCohortSize === 0 ? "All" : `≥${minCohortSize}`}
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-center gap-2 pt-6">
                    <span className="text-sm text-muted-foreground mr-1">기간</span>
                    {PERIOD_OPTIONS.map((opt) => (
                        <Button
                            key={opt.days}
                            type="button"
                            size="sm"
                            variant={periodDays === opt.days ? "default" : "outline"}
                            onClick={() => setPeriodDays(opt.days)}
                        >
                            {opt.label}
                        </Button>
                    ))}
                    <span className="mx-2 h-6 w-px bg-border" />
                    <span className="text-sm text-muted-foreground">최소 코호트</span>
                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={String(minCohortSize)}
                        onChange={(e) => setMinCohortSize(Number(e.target.value))}
                    >
                        {MIN_COHORT_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n === 0 ? "All" : `≥${n}`}
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>총 코호트 수</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">{rows.length}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>코호트 대상 Org</CardDescription>
                        <CardTitle className="text-2xl tabular-nums flex items-center gap-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            {totalOrgs}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>D30 Retention</CardDescription>
                        <CardTitle className="text-2xl tabular-nums">
                            {curve.length > 30 ? `${curve[30].retention.toFixed(1)}%` : "—"}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {error ? (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-base text-destructive">이벤트를 불러오지 못했습니다</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            {!loading && !error && rows.length === 0 ? (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-base">코호트 데이터가 없습니다</CardTitle>
                        <CardDescription>
                            `subscription_events`에 `trial_started` 이벤트가 누적되면 코호트 테이블이 생성됩니다.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : null}

            {rows.length > 0 ? (
                <>
                    <FunnelSection funnel={funnel} />
                    <RetentionCurve data={curve} />
                    <CohortTable rows={rows} />
                </>
            ) : null}
        </div>
    );
}
