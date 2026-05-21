/**
 * 팀 cashBook 전체 조회 — occurredAt 기준 페이지네이션 (대시보드 220건 샘플과 별개)
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { fetchCashBookPageDescending, TEAM_CASH_BOOK_UI_ROW_LIMIT } from "@/lib/team/teamCashBook";
import type { TeamCashBookTransaction } from "@/types/teamAccounting";
import { teamCashCategoryLabel } from "@/types/teamAccounting";

const PAGE_SIZE = 50;

function formatMoney(n: number): string {
  return `₩ ${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TeamCashBookFullLedgerPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<TeamCashBookTransaction[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    if (!teamId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchCashBookPageDescending(teamId, PAGE_SIZE, null);
      setItems(r.rows);
      setCursor(r.nextCursor);
      setHasMore(r.hasMore);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "목록을 불러오지 못했습니다.";
      setError(msg);
      setItems([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (!teamId.trim() || !hasMore || loadingMore) return;
    const nextCur = cursor;
    if (!nextCur && items.length > 0) return;
    setLoadingMore(true);
    setError(null);
    try {
      const r = await fetchCashBookPageDescending(teamId, PAGE_SIZE, nextCur);
      setItems((prev) => [...prev, ...r.rows]);
      setCursor(r.nextCursor);
      setHasMore(r.hasMore);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "추가 목록을 불러오지 못했습니다.";
      setError(msg);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="w-full py-6 pb-24">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/teams/${encodeURIComponent(teamId)}/manage?tab=accounting`)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          회계 탭으로
        </button>
        <h1 className="text-lg font-bold text-slate-900">출납부 전체 조회</h1>
      </div>

      <p className="mb-4 text-[11px] leading-relaxed text-slate-600">
        최신 거래부터 <strong>{PAGE_SIZE}건</strong>씩 불러옵니다. 팀 관리 「현금 출납부」목록은 최대{" "}
        <strong>{TEAM_CASH_BOOK_UI_ROW_LIMIT}건</strong>만 실시간 표시합니다. 위 큰 숫자(요약 잔액)와 여기 표의 합은
        의미가 다릅니다.
      </p>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          불러오는 중…
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">등록된 거래가 없습니다.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">일시</th>
                <th className="px-3 py-2.5">구분</th>
                <th className="px-3 py-2.5 text-right">금액</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((r) => (
                <tr key={r.id} className={r.isDeleted ? "opacity-50 line-through" : ""}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-700">{formatWhen(r.occurredAt)}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={r.kind === "income" ? "text-emerald-800" : "text-rose-800"}>
                      {r.kind === "income" ? "수입" : "지출"}
                    </span>
                    <span className="ml-1 text-slate-600">
                      {teamCashCategoryLabel(r.kind, r.category)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                    {formatMoney(r.amount)}
                  </td>
                  <td className="hidden max-w-[200px] truncate px-3 py-2.5 text-xs text-slate-500 sm:table-cell">
                    {r.memo || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && !loading ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                불러오는 중…
              </>
            ) : (
              "더 보기"
            )}
          </button>
        </div>
      ) : null}

      {!hasMore && items.length > 0 ? (
        <p className="mt-4 text-center text-[11px] text-slate-400">모든 거래를 불러왔습니다.</p>
      ) : null}
    </div>
  );
}
