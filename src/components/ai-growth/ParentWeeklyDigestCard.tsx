import { Link } from "react-router-dom";
import { CalendarDays, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useParentWeeklyDigest,
  type ParentWeeklyDigestEmptyReason,
} from "@/hooks/useParentWeeklyDigest";

function emptyMessage(reason: ParentWeeklyDigestEmptyReason | null): string {
  switch (reason) {
    case "no_linked_child":
      return "연결된 자녀가 없습니다.";
    case "load_error":
      return "이번 주 요약을 불러오지 못했습니다.";
    case "no_digest":
    default:
      return "이번 주 코치 확인 훈련이 저장되면 주간 요약이 표시됩니다.";
  }
}

function formatDeltaLine(
  previous: number | null,
  current: number | null,
  delta: number | null
): string | null {
  if (current === null) return null;
  if (previous === null || delta === null) return `${current}점`;
  if (delta > 0) return `${previous} → ${current} (+${delta})`;
  if (delta < 0) return `${previous} → ${current} (${delta})`;
  return `${previous} → ${current}`;
}

type Props = {
  className?: string;
};

/** Sprint D-1.1b — Parent Home 주간 성장 요약 */
export function ParentWeeklyDigestCard({ className }: Props) {
  const { data, loading, emptyReason } = useParentWeeklyDigest();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-800",
          className
        )}
        data-testid="parent-weekly-digest-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        이번 주 요약 불러오는 중…
      </div>
    );
  }

  if (!data) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-violet-300 bg-gradient-to-b from-violet-50/70 to-white p-4",
          className
        )}
        data-testid="parent-weekly-digest-empty"
        aria-label="이번 주 요약"
      >
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 h-5 w-5 text-violet-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-violet-950">이번 주 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-violet-900">{emptyMessage(emptyReason)}</p>
          </div>
        </div>
      </section>
    );
  }

  const { playerName, teamName, weekKey, summary, reportHref } = data;
  const deltaLine = formatDeltaLine(
    summary.scorePrevious,
    summary.scoreCurrent,
    summary.delta
  );

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-indigo-50/90 p-4 shadow-sm sm:p-5",
        className
      )}
      data-testid="parent-weekly-digest-card"
      aria-label="이번 주 요약"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-violet-950">이번 주 요약</h2>
          <p className="mt-0.5 text-xs text-violet-800">
            {playerName} 선수 · {teamName}
          </p>
          <p className="mt-0.5 text-[10px] text-violet-600">{weekKey}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" className="border-violet-300" asChild>
          <Link to={reportHref}>훈련 리포트 보기</Link>
        </Button>
      </div>

      {deltaLine ? (
        <div className="mt-4 rounded-xl border border-violet-200 bg-white px-4 py-3 text-center">
          <p className="text-xs font-semibold text-violet-700">이번 주 성장</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-violet-950">{deltaLine}</p>
        </div>
      ) : null}

      {summary.strengths.length > 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <p className="text-xs font-bold text-emerald-900">강점</p>
          <ul className="mt-2 space-y-1">
            {summary.strengths.map((item) => (
              <li key={item} className="text-sm text-emerald-950">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.improvements.length > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <p className="text-xs font-bold text-amber-900">개선점</p>
          <ul className="mt-2 space-y-1">
            {summary.improvements.map((item) => (
              <li key={item} className="text-sm text-amber-950">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.nextTraining.length > 0 ? (
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
          <p className="text-xs font-bold text-indigo-900">다음 훈련 추천</p>
          <ul className="mt-2 space-y-1">
            {summary.nextTraining.map((item) => (
              <li key={item} className="text-sm text-indigo-950">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-violet-800">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        코치 확인 완료
      </p>
    </section>
  );
}
