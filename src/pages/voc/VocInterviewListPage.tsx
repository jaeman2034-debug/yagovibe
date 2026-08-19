import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VocDashboardPage from "@/pages/hub/interviews/VocDashboardPage";
import { useMyTeams } from "@/hooks/useMyTeams";
import {
  formatVocCapturedAt,
  listRecentVocFeedback,
  type VocFeedbackListItem,
} from "@/lib/voc/vocFeedbackService";
import { VOC_FEATURE_LABELS, VOC_PERSONA_LABELS } from "@/lib/voc/vocFeedbackTypes";
import { buildVocTeamOptions } from "@/lib/voc/useVocTeamOptions";
import { cn } from "@/lib/utils";

const VOC_FETCH_MAX = 100;

type VocTab = "list" | "dashboard";

export default function VocInterviewListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { teamMembers, loading: teamsLoading } = useMyTeams();
  const [teamId, setTeamId] = useState("");
  const initialTab = searchParams.get("tab") === "dashboard" ? "dashboard" : "list";
  const [tab, setTab] = useState<VocTab>(initialTab);
  const [items, setItems] = useState<VocFeedbackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamOptions = useMemo(() => buildVocTeamOptions(teamMembers), [teamMembers]);

  useEffect(() => {
    const next = searchParams.get("tab") === "dashboard" ? "dashboard" : "list";
    setTab(next);
  }, [searchParams]);

  function selectTab(next: VocTab) {
    setTab(next);
    if (next === "dashboard") {
      setSearchParams({ tab: "dashboard" }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  useEffect(() => {
    if (teamId || teamOptions.length === 0) return;
    setTeamId(teamOptions[0].id);
  }, [teamId, teamOptions]);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void listRecentVocFeedback(teamId, VOC_FETCH_MAX)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "목록 로드 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const avgUsage =
    items.length > 0
      ? (items.reduce((s, i) => s + (i.ratingUsage ?? 0), 0) / items.length).toFixed(1)
      : "—";

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-4 pb-24">
      <Link to="/hub" className="text-sm font-medium text-violet-800">
        ← Hub
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">💬 인터뷰</h1>
          <p className="mt-1 text-xs text-slate-600">
            {tab === "dashboard"
              ? "VOC Dashboard · I-2.2~2.5 · Pilot Report PDF"
              : "Voice Interview Capture · I-2.1"}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/hub/interviews/new">+ 등록</Link>
        </Button>
      </div>

      <div className="mt-4 flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold",
            tab === "list" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
          onClick={() => selectTab("list")}
        >
          목록
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold",
            tab === "dashboard" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
          )}
          onClick={() => selectTab("dashboard")}
        >
          Dashboard
        </button>
      </div>

      {teamOptions.length > 0 ? (
        <label className="mt-3 block text-sm">
          <span className="font-semibold text-slate-700">팀</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            disabled={teamsLoading}
          >
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? <p className="mt-4 text-sm text-slate-500">불러오는 중…</p> : null}

      {!loading && tab === "dashboard" ? (
        <div className="mt-4" data-testid="voc-dashboard-panel">
          <VocDashboardPage
            items={items}
            teamLabel={teamOptions.find((t) => t.id === teamId)?.label}
          />
        </div>
      ) : null}

      {!loading && tab === "list" ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-violet-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase text-violet-700">총 인터뷰</p>
              <p className="text-2xl font-bold text-slate-900">{items.length}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase text-violet-700">평균 Q2</p>
              <p className="text-2xl font-bold text-slate-900">{avgUsage}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
                아직 인터뷰가 없습니다.
                <br />
                <Link
                  to="/hub/interviews/new"
                  className="mt-2 inline-block font-semibold text-violet-700"
                >
                  + 첫 인터뷰 등록
                </Link>
              </div>
            ) : null}
            {items.map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">{VOC_PERSONA_LABELS[row.persona]}</span>
                  <span className="text-slate-500">{row.orgLabel}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                    {VOC_FEATURE_LABELS[row.feature]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Q2 {row.ratingUsage}/5 · {formatVocCapturedAt(row.capturedAt)}
                </p>
                {row.positiveText ? (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-800">{row.positiveText}</p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
