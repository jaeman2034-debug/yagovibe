import type { ReactNode } from "react";
import { Award, ClipboardList, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

const AXIS_LABELS: Record<string, string> = {
  spatial: "공간 인식",
  vision: "시야",
  decision: "의사결정",
  pressure: "압박 대응",
  tactics: "전술",
};

export function VisionTeamFiiCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const score = view?.teamFiiOverall;

  return (
    <VisionCardFrame
      title="Team FII"
      testId="vision-team-fii-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={cardState === "ready" && score == null}
      emptyMessage="팀 FII가 아직 계산되지 않았습니다."
    >
      {score != null ? (
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black tabular-nums",
              variant === "dark"
                ? "bg-violet-600/30 text-white"
                : "bg-violet-100 text-violet-900"
            )}
          >
            {score}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs font-medium",
                variant === "dark" ? "text-violet-200" : "text-violet-700"
              )}
            >
              Football Intelligence Index
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-semibold leading-snug",
                variant === "dark" ? "text-violet-50" : "text-violet-950"
              )}
            >
              {view?.matchHeadline ?? "경기 FII 집계"}
            </p>
            {view?.fiiDataSource === "fii_summary" ? (
              <p className="mt-1 text-[10px] opacity-70">Source: fii_summary.json (RC4-2)</p>
            ) : null}
          </div>
          <Award
            className={cn(
              "h-8 w-8 shrink-0 opacity-40",
              variant === "dark" ? "text-violet-200" : "text-violet-600"
            )}
            aria-hidden
          />
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function VisionMatchSummaryCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();

  const hasContent = Boolean(view?.matchSummaryText?.trim() || view?.matchHeadline?.trim());

  return (
    <VisionCardFrame
      title="Match Summary"
      testId="vision-match-summary-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={cardState === "ready" && !hasContent}
      emptyMessage="경기 요약이 아직 없습니다."
    >
      {view && hasContent ? (
        <div className="space-y-2">
          {view.matchHeadline ? (
            <p
              className={cn(
                "text-sm font-black",
                variant === "dark" ? "text-white" : "text-violet-950"
              )}
            >
              {view.matchHeadline}
            </p>
          ) : null}
          {view.matchSummaryText ? (
            <p
              className={cn(
                "text-sm leading-relaxed",
                variant === "dark" ? "text-violet-100" : "text-violet-900"
              )}
            >
              {view.matchSummaryText}
            </p>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function VisionCoachDecisionBriefCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const brief = view?.coachDecisionBrief;
  const reviewHooks = view?.reviewHooks ?? [];
  const hasBrief = Boolean(
    brief?.keyChangeToday?.trim() ||
      brief?.nextTrainingFocus?.trim() ||
      (brief?.playersToCoach?.length ?? 0) > 0
  );

  return (
    <VisionCardFrame
      title="코치 훈련 브리프"
      testId="vision-coach-decision-brief-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={cardState === "ready" && !hasBrief}
      emptyMessage="훈련 브리프가 아직 없습니다."
    >
      {view && hasBrief && brief ? (
        <div className="space-y-4 text-sm">
          <BriefBlock
            title="1. 오늘 가장 중요한 변화"
            body={brief.keyChangeToday}
            variant={variant}
            tone="neutral"
          />
          <BriefBlock
            title="2. 다음 훈련 우선 개선"
            body={brief.nextTrainingFocus}
            variant={variant}
            tone="action"
            icon={<TrendingUp className="h-3 w-3" aria-hidden />}
          />
          {(brief.playersToCoach?.length ?? 0) > 0 ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2",
                variant === "dark" ? "border-violet-400/30" : "border-violet-200"
              )}
            >
              <p
                className={cn(
                  "mb-1.5 text-[10px] font-bold uppercase tracking-wide",
                  variant === "dark" ? "text-violet-200" : "text-violet-800"
                )}
              >
                3. 집중 지도 선수
              </p>
              <ul className="space-y-2">
                {brief.playersToCoach.map((player) => (
                  <li key={player.trackId}>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        variant === "dark" ? "text-violet-50" : "text-violet-950"
                      )}
                    >
                      {player.name}
                      <span className="font-normal opacity-80"> · {player.focus}</span>
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-relaxed",
                        variant === "dark" ? "text-violet-100" : "text-violet-900"
                      )}
                    >
                      {player.oneLiner}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {reviewHooks.length > 0 ? (
            <div
              className={cn(
                "rounded-xl border px-3 py-2",
                variant === "dark" ? "border-emerald-500/30" : "border-emerald-200"
              )}
            >
              <p
                className={cn(
                  "mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
                  variant === "dark" ? "text-emerald-200" : "text-emerald-800"
                )}
              >
                <ClipboardList className="h-3 w-3" aria-hidden />
                복기 포인트 (훈련 직후)
              </p>
              <ul className="space-y-2">
                {reviewHooks.map((hook) => (
                  <li key={`${hook.label}-${hook.headlineMetric}`}>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        variant === "dark" ? "text-emerald-50" : "text-emerald-950"
                      )}
                    >
                      {hook.label} — {hook.headlineMetric}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs leading-relaxed",
                        variant === "dark" ? "text-emerald-100" : "text-emerald-900"
                      )}
                    >
                      {hook.suggestedAction}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

export function VisionCoachInsightCard() {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();

  const strengths = view?.coachStrengths ?? [];
  const improvements = view?.improvementPoints ?? [];
  const training = view?.trainingRecommendations ?? [];
  const hasContent = strengths.length + improvements.length + training.length > 0;

  return (
    <VisionCardFrame
      title="Coach Insights"
      testId="vision-coach-insight-card"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={cardState === "ready" && !hasContent}
      emptyMessage="코치 인사이트가 아직 없습니다."
    >
      {view && hasContent ? (
        <div className="space-y-4 text-sm">
          {strengths.length > 0 ? (
            <InsightBlock
              title="강점"
              items={strengths}
              variant={variant}
              tone="positive"
            />
          ) : null}
          {improvements.length > 0 ? (
            <InsightBlock
              title="개선 포인트"
              items={improvements}
              variant={variant}
              tone="warn"
            />
          ) : null}
          {training.length > 0 ? (
            <InsightBlock
              title="추천 훈련"
              items={training}
              variant={variant}
              tone="action"
              icon={<TrendingUp className="h-3 w-3" aria-hidden />}
            />
          ) : null}
        </div>
      ) : null}
    </VisionCardFrame>
  );
}

function BriefBlock({
  title,
  body,
  variant,
  tone,
  icon,
}: {
  title: string;
  body: string;
  variant: "light" | "dark";
  tone: "neutral" | "action";
  icon?: ReactNode;
}) {
  const border =
    tone === "action"
      ? variant === "dark"
        ? "border-violet-400/30"
        : "border-violet-200"
      : variant === "dark"
        ? "border-slate-500/30"
        : "border-slate-200";

  return (
    <div className={cn("rounded-xl border px-3 py-2", border)}>
      <p
        className={cn(
          "mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
          variant === "dark" ? "text-violet-200" : "text-violet-800"
        )}
      >
        {icon}
        {title}
      </p>
      <p
        className={cn(
          "text-xs leading-relaxed",
          variant === "dark" ? "text-violet-50" : "text-violet-950"
        )}
      >
        {body}
      </p>
    </div>
  );
}

function InsightBlock({
  title,
  items,
  variant,
  tone,
  icon,
}: {
  title: string;
  items: string[];
  variant: "light" | "dark";
  tone: "positive" | "warn" | "action";
  icon?: ReactNode;
}) {
  const border =
    tone === "positive"
      ? variant === "dark"
        ? "border-emerald-500/30"
        : "border-emerald-200"
      : tone === "warn"
        ? variant === "dark"
          ? "border-amber-500/30"
          : "border-amber-200"
        : variant === "dark"
          ? "border-violet-400/30"
          : "border-violet-200";

  return (
    <div className={cn("rounded-xl border px-3 py-2", border)}>
      <p
        className={cn(
          "mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide",
          variant === "dark" ? "text-violet-200" : "text-violet-800"
        )}
      >
        {icon}
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item}
            className={cn(
              "text-xs leading-relaxed",
              variant === "dark" ? "text-violet-50" : "text-violet-950"
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { AXIS_LABELS };
