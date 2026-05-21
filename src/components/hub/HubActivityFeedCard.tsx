import type { TransitionEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { ActivityFocus } from "@/context/HubContext";
import { useAuth } from "@/context/AuthProvider";
import {
  sportHubHref,
  resolveLastSportId,
  sportMarketDetailUrl,
} from "@/utils/sportHubHref";
import { HubActivityFeedExposureMenu } from "@/components/hub/HubActivityFeedExposureMenu";
import { useHubFeedCardImpression } from "@/hooks/useHubFeedCardImpression";
import {
  hubFeedDwellActiveIsFresh,
  hubFeedDwellSessionKey,
  trackFeedClick,
  type HubFeedSource,
  type HubFeedUserStatus,
} from "@/lib/feedAnalytics";

export type HubActivityFeedCardModel = {
  type: ActivityFocus;
  title: string;
  subtitle?: string;
  time: string;
  id?: string;
  image?: string;
  extra?: Record<string, unknown>;
};

type HubActivityFeedCardProps = {
  activity: HubActivityFeedCardModel;
  index: number;
  feedSource: HubFeedSource;
  loading: boolean;
  exitingActivityIds: Set<string>;
  beginExitActivity: (id: string) => void;
  restoreActivity: (id: string) => void;
  finalizeExitActivity: (id: string) => void;
};

export function HubActivityFeedCard({
  activity,
  index,
  feedSource,
  loading,
  exitingActivityIds,
  beginExitActivity,
  restoreActivity,
  finalizeExitActivity,
}: HubActivityFeedCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const activityDocId =
    typeof activity.extra?.activityDocId === "string" && activity.extra.activityDocId
      ? activity.extra.activityDocId
      : "";

  const authorId =
    typeof activity.extra?.authorId === "string" && activity.extra.authorId
      ? activity.extra.authorId
      : undefined;

  const impressionActivityId = activityDocId || `legacy:${String(activity.id ?? index)}`;
  const userStatus: HubFeedUserStatus = user?.uid ? "logged_in" : "anon";

  const isExiting =
    Boolean(activityDocId) && activityDocId !== "" && exitingActivityIds.has(activityDocId);

  const impressionRef = useHubFeedCardImpression({
    activityId: impressionActivityId,
    position: index,
    feedSource,
    userStatus,
    enabled: !loading && !isExiting,
  });

  const activityIcon = {
    trading: "🛒",
    team: "👥",
    events: "📅",
    venues: "📍",
    social: "💬",
  }[activity.type] || "📌";
  const originTypeForCard = typeof activity.extra?.originType === "string" ? activity.extra.originType : "";
  const refTypeForCard = typeof activity.extra?.refType === "string" ? activity.extra.refType : "";
  const isMatchCard =
    originTypeForCard === "match_created" ||
    originTypeForCard === "match_join_requested" ||
    originTypeForCard === "match_confirmed" ||
    refTypeForCard === "match";
  const resolvedIcon = isMatchCard ? "⚽" : activityIcon;

  const sportLabelForSheet =
    activity.type === "trading" && typeof activity.extra?.sportLabel === "string"
      ? activity.extra.sportLabel.trim()
      : "";
  const kindLabelForSheet =
    isMatchCard
      ? "매칭"
      : activity.type === "trading"
      ? "거래"
      : activity.type === "team"
        ? "팀"
        : activity.type === "events"
          ? "이벤트"
          : activity.type === "venues"
            ? "장소"
            : activity.type === "social"
              ? "소셜"
              : "";
  const sheetMeta =
    sportLabelForSheet && kindLabelForSheet
      ? `${sportLabelForSheet} · ${kindLabelForSheet}`
      : kindLabelForSheet || sportLabelForSheet || undefined;

  const handleClick = () => {
    const ext = (activity.extra || {}) as Record<string, unknown>;
    const originType = typeof ext.originType === "string" ? ext.originType : "";
    const refType = typeof ext.refType === "string" ? ext.refType : "";
    const teamId = typeof ext.teamId === "string" ? ext.teamId : "";
    const assocId = typeof ext.associationId === "string" ? ext.associationId : "";
    const sid = (typeof ext.sport === "string" && ext.sport) || resolveLastSportId();

    const go = (destination: string) => {
      const clickedAfterDwell =
        typeof sessionStorage !== "undefined" &&
        (sessionStorage.getItem(hubFeedDwellSessionKey(impressionActivityId)) === "1" ||
          hubFeedDwellActiveIsFresh(impressionActivityId))
          ? 1
          : 0;
      void trackFeedClick({
        activityId: impressionActivityId,
        position: index,
        feedSource,
        destination,
        userStatus,
        clicked_after_dwell: clickedAfterDwell,
      });
      navigate(destination);
    };

    if (!activity.id) {
      go(sportHubHref("activity"));
      return;
    }

    if (activity.type === "events" && assocId) {
      go(`/association/${assocId}/tournaments/${activity.id}`);
      return;
    }

    /** 매칭 상세는 `matches/{matchId}` — 활동 문서 id와 혼동하면 전부 not found */
    const refIdFromExtra =
      typeof ext.refId === "string" && ext.refId.trim() ? ext.refId.trim() : "";
    const matchTargetId =
      refIdFromExtra ||
      (activityDocId && activity.id && activity.id !== activityDocId
        ? String(activity.id).trim()
        : !activityDocId && activity.id
          ? String(activity.id).trim()
          : "");
    const isMatchNav =
      refType === "match" ||
      originType === "match_created" ||
      originType === "match_join_requested" ||
      originType === "match_confirmed";

    if (isMatchNav) {
      if (!matchTargetId) {
        toast.error("매칭 글을 찾을 수 없습니다. 목록에서 다시 열어 주세요.");
        go("/match");
        return;
      }
      go(`/match/${matchTargetId}`);
      return;
    }

    if (originType === "team_created" && refType === "teams") {
      go(`/teams/${activity.id}/play`);
      return;
    }

    if (activity.type === "events") {
      if (refType === "events" || originType === "team_event") {
        go(`/events/${activity.id}`);
        return;
      }
      go(sportHubHref("event"));
      return;
    }

    if (originType === "team_notice") {
      go(teamId ? `/teams/${teamId}/play` : sportHubHref("team"));
      return;
    }

    if (originType === "recruit_created") {
      if (refType === "recruit") {
        go(`/recruit/${activity.id}`);
        return;
      }
      go(sportMarketDetailUrl(String(sid), activity.id));
      return;
    }

    if (activity.type === "trading") {
      go(sportMarketDetailUrl(String(sid), activity.id));
      return;
    }

    if (activity.type === "team") {
      go(sportHubHref("team"));
      return;
    }

    go(sportHubHref("activity"));
  };

  const handleExitTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (!activityDocId) return;
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "opacity") return;
    finalizeExitActivity(activityDocId);
  };

  return (
    <div
      ref={impressionRef}
      onTransitionEnd={activityDocId ? handleExitTransitionEnd : undefined}
      className={`min-h-0 shrink-0 overflow-hidden rounded-lg border border-gray-200/90 bg-transparent motion-safe:transition-[max-height,opacity,transform,border-color] motion-safe:duration-300 motion-safe:ease-in-out motion-reduce:transition-none ${
        isExiting
          ? "pointer-events-none max-h-0 scale-[0.98] border-transparent opacity-0 motion-reduce:duration-0"
          : "max-h-[720px] scale-100 opacity-100 hover:border-gray-300"
      }`}
    >
      <div
        role="button"
        tabIndex={isExiting ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`flex gap-3 p-3 ${isExiting ? "cursor-default" : "cursor-pointer"}`}
      >
        {activity.image ? (
          <img
            src={activity.image}
            alt={activity.title}
            className="h-12 w-12 flex-shrink-0 self-start rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 self-start items-center justify-center rounded-lg border border-gray-200/80 bg-transparent text-xl">
            {resolvedIcon}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {(activity.type === "trading" || isMatchCard) && activity.extra?.sportLabel && activity.extra?.sportIcon ? (
            <div className="mb-1 flex items-center gap-1">
              <span className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-100">
                <span aria-hidden>{activity.extra.sportIcon}</span>
                <span className="truncate">{activity.extra.sportLabel}</span>
              </span>
              <span className="text-[10px] font-medium text-gray-400">{isMatchCard ? "매칭" : "거래"}</span>
            </div>
          ) : null}

          <div className="flex min-w-0 items-start gap-1">
            <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900 line-clamp-2">
              {activity.title}
            </p>
            {activityDocId ? (
              <div
                className="flex-shrink-0 -mr-1 -mt-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <HubActivityFeedExposureMenu
                  activityDocId={activityDocId}
                  userId={user?.uid}
                  authorId={authorId}
                  sheetPreview={{
                    title: activity.title,
                    subtitle: activity.subtitle,
                    imageUrl: activity.image,
                    meta: sheetMeta,
                    listGlyph: resolvedIcon,
                  }}
                  feedAnalytics={{
                    position: index,
                    feedSource,
                    userStatus,
                  }}
                  onRemoveFromFeed={() => beginExitActivity(activityDocId)}
                  onRestoreFromFeed={() => restoreActivity(activityDocId)}
                />
              </div>
            ) : null}
          </div>

          {!((activity.type === "trading" || isMatchCard) && activity.extra?.sportLabel) ? (
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {isMatchCard
                  ? "팀"
                  : activity.type === "trading"
                  ? "거래"
                  : activity.type === "team"
                    ? "팀"
                    : activity.type === "events"
                      ? "이벤트"
                      : ""}
              </span>
            </div>
          ) : null}

          {activity.subtitle ? (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{activity.subtitle}</p>
          ) : null}

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">{activity.time}</span>
            <span className="text-xs text-blue-600">→</span>
          </div>
        </div>
      </div>
    </div>
  );
}
