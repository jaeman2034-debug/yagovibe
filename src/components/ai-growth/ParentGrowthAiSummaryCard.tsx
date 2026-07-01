import { Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useParentGrowthAiSummary,
  type ParentGrowthAiSummaryEmptyReason,
} from "@/hooks/useParentGrowthAiSummary";

function emptyMessage(reason: ParentGrowthAiSummaryEmptyReason | null): string {
  switch (reason) {
    case "no_linked_child":
      return "연결된 자녀가 없습니다.";
    case "no_avatar":
      return "코치가 훈련 리포트를 저장하면 AI 성장 요약이 표시됩니다.";
    case "load_error":
      return "AI 성장 요약을 불러오지 못했습니다.";
    default:
      return "보호자로 등록된 팀이 없습니다.";
  }
}

type Props = {
  className?: string;
};

/** Sprint D-5.5-b — Parent Home AI 성장 요약 카드 */
export function ParentGrowthAiSummaryCard({ className }: Props) {
  const { data, loading, emptyReason } = useParentGrowthAiSummary();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-800",
          className
        )}
        data-testid="parent-growth-ai-summary-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        AI 성장 요약 생성 중…
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
        data-testid="parent-growth-ai-summary-empty"
        aria-label="AI 성장 요약"
      >
        <div className="flex items-start gap-2">
          <Brain className="mt-0.5 h-5 w-5 text-violet-600" aria-hidden />
          <div>
            <h2 className="text-base font-bold text-violet-950">AI 성장 요약</h2>
            <p className="mt-2 text-sm leading-relaxed text-violet-900">{emptyMessage(emptyReason)}</p>
          </div>
        </div>
      </section>
    );
  }

  const { playerName, teamName, paragraphs } = data;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-indigo-50/90 p-4 shadow-sm sm:p-5",
        className
      )}
      data-testid="parent-growth-ai-summary-card"
      aria-label="AI 성장 요약"
    >
      <h2 className="flex items-center gap-1.5 text-lg font-black text-violet-950">
        <Brain className="h-5 w-5 text-violet-600" aria-hidden />
        AI 성장 요약
      </h2>
      <p className="mt-0.5 text-xs text-violet-800">
        {playerName} · {teamName}
      </p>

      <div className="mt-4 space-y-3">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-sm leading-relaxed text-violet-950"
            data-testid={index === 0 ? "parent-growth-ai-summary-lead" : undefined}
          >
            {paragraph}
          </p>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-violet-600">
        코치 검증 데이터 · Avatar · 위험 분석 · 추천 엔진 기반 요약
      </p>
    </section>
  );
}
