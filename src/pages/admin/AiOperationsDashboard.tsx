/**
 * Priority 1-3 — AI Operations Dashboard
 * VOC + Prompt Version 운영 통계 (읽기 전용 · Prompt 편집 없음)
 * Canonical: /admin/ai-operations
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  PencilLine,
  Percent,
  Tag,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useRoleGate } from "@/hooks/useRoleGate";
import { useMyTeams } from "@/hooks/useMyTeams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  aggregateAiFeedback,
  AI_OPS_FEATURE_LABEL,
  formatGoodRate,
  type AiOpsAggregate,
} from "@/lib/team/aiOperationsAggregate";
import { fetchTeamAiFeedback } from "@/lib/team/fetchTeamAiFeedback";
import { AI_CONTENT_PROMPT_VERSION, type AiContentFeatureType } from "@/lib/ai/promptRegistry";
import { cn } from "@/lib/utils";

function fmtTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function featureLabel(featureType: string): string {
  if (featureType in AI_OPS_FEATURE_LABEL) {
    return AI_OPS_FEATURE_LABEL[featureType as AiContentFeatureType];
  }
  return featureType || "—";
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function AiOperationsDashboard() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const { isPlatformAdmin, isManager, loading: roleLoading } = useRoleGate();
  const { teams, loading: teamsLoading } = useMyTeams();

  const paramTeamId = (searchParams.get("teamId") || "").trim();
  const [teamIdInput, setTeamIdInput] = useState(paramTeamId);
  const [activeTeamId, setActiveTeamId] = useState(paramTeamId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agg, setAgg] = useState<AiOpsAggregate | null>(null);

  const managedTeams = useMemo(() => {
    return (teams || []).filter((t) => {
      const role = String(t.role || "").toLowerCase();
      const access = String(t.accessLevel || "").toUpperCase();
      return (
        role === "owner" ||
        role === "admin" ||
        role === "manager" ||
        access === "OWNER" ||
        access === "ADMIN"
      );
    });
  }, [teams]);

  /** 플랫폼 admin/manager 또는 팀 운영진(VOC 제출 가능 역할) */
  const hasPermission = Boolean(isPlatformAdmin || isManager || managedTeams.length > 0);

  useEffect(() => {
    setTeamIdInput(paramTeamId);
    if (paramTeamId) setActiveTeamId(paramTeamId);
  }, [paramTeamId]);

  useEffect(() => {
    if (activeTeamId || teamsLoading) return;
    if (managedTeams.length === 1) {
      const id = managedTeams[0]?.teamId?.trim();
      if (id) {
        setActiveTeamId(id);
        setTeamIdInput(id);
      }
    }
  }, [activeTeamId, managedTeams, teamsLoading]);

  const load = useCallback(async (teamId: string) => {
    const tid = teamId.trim();
    if (!tid) {
      setAgg(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const docs = await fetchTeamAiFeedback(tid, 500);
      setAgg(aggregateAiFeedback(docs, 20));
    } catch (e: unknown) {
      console.error("[AiOperationsDashboard] load", e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message)
          : "VOC 데이터를 불러오지 못했습니다.";
      setError(msg.includes("permission") ? "이 팀의 VOC를 읽을 권한이 없습니다." : msg);
      setAgg(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasPermission || !activeTeamId) return;
    void load(activeTeamId);
  }, [hasPermission, activeTeamId, load]);

  const applyTeam = () => {
    const tid = teamIdInput.trim();
    setActiveTeamId(tid);
    if (tid) {
      setSearchParams({ teamId: tid }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const currentRegistryVersions = useMemo(() => {
    const set = new Set(Object.values(AI_CONTENT_PROMPT_VERSION));
    return [...set];
  }, []);

  if (authLoading || roleLoading || teamsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="로딩" />
      </div>
    );
  }

  if (!authUser) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  const goodRateLabel = formatGoodRate(agg?.goodRate ?? null);
  const primaryVersion = currentRegistryVersions[0] || "v1.0.0";
  const versionRows =
    agg && agg.byVersion.length > 0
      ? agg.byVersion
      : [{ version: primaryVersion, generate: 0, good: 0, needsEdit: 0, goodRate: null }];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
              관리 홈
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">AI 운영</h1>
          <p className="text-sm text-muted-foreground">
            VOC·Prompt Version 운영 통계 (읽기 전용). Prompt 수정은 포함하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || !activeTeamId}
            onClick={() => void load(activeTeamId)}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            새로고침
          </Button>
          <Button type="button" size="sm" variant="default" asChild>
            <Link
              to={
                activeTeamId
                  ? `/admin/ai-prompt-review?teamId=${encodeURIComponent(activeTeamId)}`
                  : "/admin/ai-prompt-review"
              }
            >
              Prompt Review
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">팀 선택</CardTitle>
          <CardDescription>
            `teams/{"{teamId}"}/aiFeedback` 를 집계합니다. 팀 운영진 또는 플랫폼 관리자만 조회할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            {managedTeams.length > 0 ? (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={
                  managedTeams.some((t) => t.teamId === teamIdInput) ? teamIdInput : ""
                }
                onChange={(e) => setTeamIdInput(e.target.value)}
              >
                <option value="">팀 선택…</option>
                {managedTeams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamId} · {t.role || t.accessLevel || "staff"}
                  </option>
                ))}
              </select>
            ) : null}
            <Input
              value={teamIdInput}
              onChange={(e) => setTeamIdInput(e.target.value)}
              placeholder="teamId"
              className="font-mono text-sm"
            />
          </div>
          <Button type="button" onClick={applyTeam} disabled={!teamIdInput.trim()}>
            조회
          </Button>
        </CardContent>
      </Card>

      {!activeTeamId ? (
        <p className="text-sm text-muted-foreground">팀 ID를 선택한 뒤 조회하세요.</p>
      ) : loading && !agg ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          VOC 불러오는 중…
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <KpiCard
              title="총 생성 수"
              subtitle="Total Generate · VOC 기준"
              value={String(agg?.total ?? 0)}
              icon={<Sparkles className="h-4 w-4" />}
            />
            <KpiCard
              title="좋아요"
              subtitle="Good"
              value={String(agg?.good ?? 0)}
              icon={<ThumbsUp className="h-4 w-4" />}
            />
            <KpiCard
              title="수정 필요"
              subtitle="Needs Edit"
              value={String(agg?.needsEdit ?? 0)}
              icon={<PencilLine className="h-4 w-4" />}
            />
            <KpiCard
              title="좋아요 비율"
              subtitle="Good %"
              value={goodRateLabel}
              icon={<Percent className="h-4 w-4" />}
            />
            <KpiCard
              title="현재 Prompt Version"
              subtitle="Registry"
              value={primaryVersion}
              icon={<Tag className="h-4 w-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature별 통계</CardTitle>
              <CardDescription>Club Intro · Captain · Recruit · Social · Event</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 pr-3 font-medium">Generate</th>
                    <th className="py-2 pr-3 font-medium">Good</th>
                    <th className="py-2 pr-3 font-medium">Needs Edit</th>
                    <th className="py-2 font-medium">Good Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(agg?.byFeature ?? []).map((row) => (
                    <tr key={row.featureType} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.generate}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.good}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.needsEdit}</td>
                      <td className="py-2.5 tabular-nums">{formatGoodRate(row.goodRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt Version</CardTitle>
              <CardDescription>
                현재 운영 Registry: {currentRegistryVersions.join(", ")} · 다중 버전 확장 가능
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {versionRows.map((row) => (
                  <div
                    key={row.version}
                    className="rounded-xl border border-border bg-muted/30 px-4 py-3"
                  >
                    <p className="text-xs text-muted-foreground">운영 Version</p>
                    <p className="mt-0.5 font-mono text-lg font-semibold">{row.version}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Generate</dt>
                        <dd className="font-medium tabular-nums">{row.generate}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Good Rate</dt>
                        <dd className="font-medium tabular-nums">{formatGoodRate(row.goodRate)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 VOC</CardTitle>
              <CardDescription>최근 20건 · comment 없으면 -</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">시간</th>
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 pr-3 font-medium">Rating</th>
                    <th className="py-2 pr-3 font-medium">Version</th>
                    <th className="py-2 font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {(agg?.recent ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        아직 VOC가 없습니다. AI 생성 후 피드백을 제출하면 여기에 표시됩니다.
                      </td>
                    </tr>
                  ) : (
                    (agg?.recent ?? []).map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0 align-top">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-xs tabular-nums">
                          {fmtTime(row.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3">{featureLabel(row.featureType)}</td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              row.rating === "good"
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                : row.rating === "needs_edit"
                                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            {row.rating === "good"
                              ? "good"
                              : row.rating === "needs_edit"
                                ? "needs_edit"
                                : row.rating || "—"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs">{row.promptVersion || "—"}</td>
                        <td className="py-2.5 max-w-[280px] break-words text-muted-foreground">
                          {row.comment?.trim() ? row.comment.trim() : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
