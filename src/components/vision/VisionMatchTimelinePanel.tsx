/**
 * RC4-5 M5 — Vision match event timeline (fii_summary metadata · no engine change)
 */

import { cn } from "@/lib/utils";
import { useVisionPlatformMatchMeta } from "@/hooks/useVisionPlatformMatchMeta";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { VisionJobMonitorPanel } from "@/components/vision/VisionJobMonitorPanel";
import { VISION_TIMELINE_SECTION_ID } from "@/lib/vision/visionPlatformRoutes";

type Props = {
  teamId: string;
  matchId: string;
  className?: string;
  variant?: "light" | "dark";
};

const EVENT_LABELS: Record<string, string> = {
  PASS: "패스",
  RECEIVE: "볼 받기",
  TURNOVER: "턴오버",
  POSSESSION_START: "점유 시작",
  POSSESSION_END: "점유 종료",
};

export function VisionMatchTimelinePanel({ teamId, matchId, className, variant = "light" }: Props) {
  const { meta, loading, isPilot } = useVisionPlatformMatchMeta(matchId);

  if (!isPilot) {
    return (
      <section
        id={VISION_TIMELINE_SECTION_ID}
        className={cn("scroll-mt-20", className)}
        data-testid="vision-match-timeline-panel"
      >
        <VisionCardFrame
          title="경기 타임라인"
          testId="vision-match-timeline-empty"
          empty
          emptyMessage="이 경기의 Vision 타임라인이 아직 없습니다."
        />
      </section>
    );
  }

  const highlights = meta?.eventHighlights;
  const events = highlights
    ? [
        { key: "PASS", count: highlights.passes },
        { key: "RECEIVE", count: highlights.receives },
        { key: "TURNOVER", count: highlights.turnovers },
      ].filter((e) => e.count > 0)
    : [];

  return (
    <section
      id={VISION_TIMELINE_SECTION_ID}
      className={cn("scroll-mt-20", className)}
      data-testid="vision-match-timeline-panel"
    >
      <VisionCardFrame
        title="경기 타임라인"
        testId="vision-match-timeline-card"
        loading={loading}
        empty={!loading && events.length === 0}
        emptyMessage="이벤트 요약이 없습니다."
      >
        <VisionJobMonitorPanel
          teamId={teamId}
          matchId={matchId}
          variant={variant}
          compact
          className="mb-3"
        />
        {meta ? (
          <div className="space-y-3">
            <p
              className={cn(
                "text-xs",
                variant === "dark" ? "text-violet-200" : "text-violet-800"
              )}
            >
              GEV Production · 총{" "}
              <strong className="tabular-nums">{highlights?.totalEvents ?? 0}</strong>개 이벤트
              {meta.possessionChains != null ? (
                <>
                  {" "}
                  · 점유 체인 <strong>{meta.possessionChains}</strong>
                </>
              ) : null}
            </p>
            <ol className="space-y-2">
              {events.map((e, i) => (
                <li
                  key={e.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2",
                    variant === "dark"
                      ? "border-violet-500/30 bg-violet-950/30"
                      : "border-violet-100 bg-violet-50/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                      variant === "dark"
                        ? "bg-violet-600 text-white"
                        : "bg-violet-600 text-white"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        variant === "dark" ? "text-white" : "text-violet-950"
                      )}
                    >
                      {EVENT_LABELS[e.key] ?? e.key}
                    </p>
                    <p
                      className={cn(
                        "text-xs tabular-nums",
                        variant === "dark" ? "text-violet-300" : "text-violet-700"
                      )}
                    >
                      {e.count}회
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {meta.productionPreset ? (
              <p className="text-[10px] text-violet-600">preset: {meta.productionPreset}</p>
            ) : null}
          </div>
        ) : null}
      </VisionCardFrame>
    </section>
  );
}
