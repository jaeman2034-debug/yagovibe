/**
 * Priority 1-4 — VOC-driven Prompt Review (운영 프로세스 UI)
 * Prompt 자동 수정 없음 · Decision은 Local UI만 · Registry 수동 변경 정책
 * Canonical: /admin/ai-prompt-review
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useRoleGate } from "@/hooks/useRoleGate";
import { useMyTeams } from "@/hooks/useMyTeams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  aggregateAiFeedback,
  AI_OPS_FEATURE_LABEL,
  AI_OPS_FEATURES,
  formatGoodRate,
  type AiFeedbackDoc,
  type AiOpsAggregate,
  type FeatureStatRow,
} from "@/lib/team/aiOperationsAggregate";
import { fetchTeamAiFeedback } from "@/lib/team/fetchTeamAiFeedback";
import {
  buildPromptReviewMarkdown,
  downloadPromptReviewMarkdown,
  type FeatureReviewNote,
  type ReviewDecision,
} from "@/lib/team/aiPromptReviewExport";
import { AI_CONTENT_PROMPT_VERSION, type AiContentFeatureType } from "@/lib/ai/promptRegistry";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DecisionMap = Record<AiContentFeatureType, ReviewDecision>;
type ReasonMap = Partial<Record<AiContentFeatureType, string>>;

function emptyDecisionMap(seed?: Partial<DecisionMap>): DecisionMap {
  const out = {} as DecisionMap;
  for (const f of AI_OPS_FEATURES) {
    out[f] = seed?.[f] ?? "REVIEW";
  }
  return out;
}

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

function suggestDecision(row: FeatureStatRow): ReviewDecision {
  if (row.generate <= 0 || row.goodRate == null) return "REVIEW";
  if (row.goodRate < 70) return "UPDATE";
  if (row.goodRate < 85) return "REVIEW";
  return "KEEP";
}

function candidateHint(row: FeatureStatRow): string {
  if (row.generate <= 0) return "데이터 부족";
  if (row.goodRate == null) return "데이터 부족";
  if (row.goodRate < 70) return "개선 후보";
  if (row.goodRate < 85) return "관찰";
  return "유지";
}

export default function AiPromptReview() {
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
  const [docs, setDocs] = useState<AiFeedbackDoc[]>([]);
  const [agg, setAgg] = useState<AiOpsAggregate | null>(null);
  /** 명시적 Decision SoT — suggest는 초기 seed에만 사용 */
  const [decisions, setDecisions] = useState<DecisionMap>(() => emptyDecisionMap());
  const [reasons, setReasons] = useState<ReasonMap>({});
  const reviewTeamRef = useRef<string>("");
  const bootstrappedRef = useRef(false);

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

  const seedDecisionsFromAgg = useCallback((next: AiOpsAggregate) => {
    const seed: Partial<DecisionMap> = {};
    for (const row of next.byFeature) {
      seed[row.featureType] = suggestDecision(row);
    }
    setDecisions(emptyDecisionMap(seed));
    setReasons({});
  }, []);

  const load = useCallback(
    async (teamId: string, opts?: { resetReview?: boolean }) => {
      const tid = teamId.trim();
      if (!tid) {
        setDocs([]);
        setAgg(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await fetchTeamAiFeedback(tid, 500);
        const nextAgg = aggregateAiFeedback(list, 20);
        setDocs(list);
        setAgg(nextAgg);
        const teamChanged = reviewTeamRef.current !== tid;
        if (opts?.resetReview || teamChanged) {
          reviewTeamRef.current = tid;
          seedDecisionsFromAgg(nextAgg);
        }
      } catch (e: unknown) {
        console.error("[AiPromptReview] load", e);
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: string }).message)
            : "VOC 데이터를 불러오지 못했습니다.";
        setError(msg.includes("permission") ? "이 팀의 VOC를 읽을 권한이 없습니다." : msg);
        setDocs([]);
        setAgg(null);
      } finally {
        setLoading(false);
      }
    },
    [seedDecisionsFromAgg]
  );

  useEffect(() => {
    if (!hasPermission || !activeTeamId) return;
    void load(activeTeamId, { resetReview: reviewTeamRef.current !== activeTeamId.trim() });
  }, [hasPermission, activeTeamId, load]);

  useEffect(() => {
    if (!authLoading && !roleLoading && !teamsLoading) {
      bootstrappedRef.current = true;
    }
  }, [authLoading, roleLoading, teamsLoading]);

  const applyTeam = () => {
    const tid = teamIdInput.trim();
    setActiveTeamId(tid);
    if (tid) setSearchParams({ teamId: tid }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  const setFeatureDecision = (featureType: AiContentFeatureType, next: ReviewDecision) => {
    setDecisions((prev) => ({ ...prev, [featureType]: next }));
  };

  const setFeatureReason = (featureType: AiContentFeatureType, next: string) => {
    setReasons((prev) => ({ ...prev, [featureType]: next }));
  };

  const featuresSorted = useMemo(() => {
    const rows = agg?.byFeature ?? [];
    return [...rows].sort((a, b) => {
      const ar = a.goodRate;
      const br = b.goodRate;
      if (ar == null && br == null) return a.label.localeCompare(b.label);
      if (ar == null) return 1;
      if (br == null) return -1;
      if (ar !== br) return ar - br;
      return b.generate - a.generate;
    });
  }, [agg]);

  const comments = useMemo(() => {
    return docs
      .filter((d) => Boolean(d.comment?.trim()))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 20);
  }, [docs]);

  const registryVersions = useMemo(
    () => [...new Set(Object.values(AI_CONTENT_PROMPT_VERSION))],
    []
  );

  const buildNotesFromState = useCallback((): FeatureReviewNote[] => {
    return AI_OPS_FEATURES.map((featureType) => {
      const row = agg?.byFeature.find((f) => f.featureType === featureType);
      return {
        featureType,
        decision: decisions[featureType],
        reason: (reasons[featureType] ?? "").trim(),
        goodRate: row?.goodRate ?? null,
        generate: row?.generate ?? 0,
      };
    });
  }, [agg, decisions, reasons]);

  const exportNote = useCallback(() => {
    if (!activeTeamId || !agg) {
      toast.error("팀을 조회한 뒤 Export 하세요.");
      return;
    }
    const notes = buildNotesFromState();
    const md = buildPromptReviewMarkdown({
      teamId: activeTeamId,
      date: new Date(),
      registryVersions,
      notes,
    });
    try {
      const filename = downloadPromptReviewMarkdown(md);
      toast.success(`저장됨: ${filename}`);
    } catch (e) {
      console.error("[AiPromptReview] export", e);
      toast.error("Markdown 다운로드에 실패했어요. 브라우저 다운로드 허용을 확인해 주세요.");
    }
  }, [activeTeamId, agg, buildNotesFromState, registryVersions]);

  if (authLoading || roleLoading || (teamsLoading && !bootstrappedRef.current)) {
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
            <Link to={activeTeamId ? `/admin/ai-operations?teamId=${encodeURIComponent(activeTeamId)}` : "/admin/ai-operations"}>
              <ArrowLeft className="h-4 w-4" />
              AI 운영
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">AI Prompt Review</h1>
          <p className="text-sm text-muted-foreground">
            VOC·Version 기반 운영 검토. Prompt는 Registry만 수동 수정합니다. (Decision은 화면에만 저장)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || !activeTeamId}
            onClick={() => void load(activeTeamId, { resetReview: false })}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            새로고침
          </Button>
          <Button type="button" size="sm" className="gap-1" disabled={!agg} onClick={() => exportNote()}>
            <Download className="h-4 w-4" />
            Review Note Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">팀 선택</CardTitle>
          <CardDescription>
            Prompt 변경 시: Registry 수정 → Version bump → Changelog → 재배포 → Dashboard 재검증
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            {managedTeams.length > 0 ? (
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={managedTeams.some((t) => t.teamId === teamIdInput) ? teamIdInput : ""}
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version 비교</CardTitle>
              <CardDescription>
                Prompt Version별 Generate / Good / Needs Edit / Good Rate · 현재 Registry:{" "}
                {registryVersions.join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Version</th>
                    <th className="py-2 pr-3 font-medium">Generate</th>
                    <th className="py-2 pr-3 font-medium">Good</th>
                    <th className="py-2 pr-3 font-medium">Needs Edit</th>
                    <th className="py-2 font-medium">Good Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(agg?.byVersion?.length ? agg.byVersion : [{ version: registryVersions[0] || "v1.0.0", generate: 0, good: 0, needsEdit: 0, goodRate: null }]).map(
                    (row) => (
                      <tr key={row.version} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3 font-mono font-medium">{row.version}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.generate}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.good}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.needsEdit}</td>
                        <td className="py-2.5 tabular-nums">{formatGoodRate(row.goodRate)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">개선 후보 (Good Rate 오름차순)</CardTitle>
              <CardDescription>낮은 Good Rate → 개선 후보 · 높은 Rate → 유지 후보</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 pr-3 font-medium">Generate</th>
                    <th className="py-2 pr-3 font-medium">Good Rate</th>
                    <th className="py-2 font-medium">Hint</th>
                  </tr>
                </thead>
                <tbody>
                  {featuresSorted.map((row) => (
                    <tr key={row.featureType} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{row.label}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.generate}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{formatGoodRate(row.goodRate)}</td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            candidateHint(row) === "개선 후보"
                              ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                              : candidateHint(row) === "유지"
                                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                : "bg-muted text-muted-foreground"
                          )}
                        >
                          {candidateHint(row)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">VOC Comment</CardTitle>
              <CardDescription>comment가 있는 VOC만 · 최신 20건</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">CreatedAt</th>
                    <th className="py-2 pr-3 font-medium">Feature</th>
                    <th className="py-2 pr-3 font-medium">Version</th>
                    <th className="py-2 font-medium">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        의견이 있는 VOC가 아직 없습니다.
                      </td>
                    </tr>
                  ) : (
                    comments.map((row) => (
                      <tr key={row.id} className="border-b border-border/60 last:border-0 align-top">
                        <td className="py-2.5 pr-3 whitespace-nowrap text-xs tabular-nums">
                          {fmtTime(row.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3">
                          {row.featureType in AI_OPS_FEATURE_LABEL
                            ? AI_OPS_FEATURE_LABEL[row.featureType as AiContentFeatureType]
                            : row.featureType}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs">{row.promptVersion || "—"}</td>
                        <td className="py-2.5 max-w-[360px] break-words">{row.comment?.trim()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review Decision</CardTitle>
              <CardDescription>
                KEEP / REVIEW / UPDATE 는 화면 state에 저장됩니다. Export 시 현재 Decision·Reason이 Markdown에
                포함됩니다. (Firestore 미저장)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">현재 선택 (Export 반영값)</p>
                <ul className="mt-1 space-y-0.5 font-mono">
                  {AI_OPS_FEATURES.map((f) => (
                    <li key={f}>
                      {AI_OPS_FEATURE_LABEL[f]}: {decisions[f]}
                      {(reasons[f] ?? "").trim() ? ` · ${(reasons[f] ?? "").trim().slice(0, 40)}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              {(agg?.byFeature ?? []).map((row) => {
                const decision = decisions[row.featureType];
                return (
                  <div
                    key={row.featureType}
                    className="rounded-xl border border-border px-3 py-3 space-y-2"
                    data-feature={row.featureType}
                    data-decision={decision}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Good Rate {formatGoodRate(row.goodRate)} · Generate {row.generate} · 선택{" "}
                          <span className="font-semibold text-foreground">{decision}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${row.label} decision`}>
                        {(["KEEP", "REVIEW", "UPDATE"] as const).map((d) => {
                          const selected = decision === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              aria-pressed={selected}
                              data-state={selected ? "on" : "off"}
                              className={cn(
                                "inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                                selected
                                  ? "bg-purple-600 text-white focus:ring-purple-500"
                                  : "border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                              )}
                              onClick={() => setFeatureDecision(row.featureType, d)}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <Textarea
                      value={reasons[row.featureType] ?? ""}
                      onChange={(e) => setFeatureReason(row.featureType, e.target.value)}
                      placeholder="Reason (선택) — Export에 포함됩니다"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                );
              })}
              <div className="flex justify-end">
                <Button type="button" className="gap-1" onClick={() => exportNote()}>
                  <Download className="h-4 w-4" />
                  Review Note Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
