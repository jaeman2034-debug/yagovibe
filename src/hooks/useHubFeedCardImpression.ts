import { useEffect, useRef } from "react";
import {
  hubFeedDwellActiveSessionKey,
  hubFeedDwellSessionKey,
  trackFeedDwell,
  trackFeedImpression,
  type HubFeedSource,
  type HubFeedUserStatus,
} from "@/lib/feedAnalytics";

type Options = {
  activityId: string;
  position: number;
  feedSource: HubFeedSource;
  userStatus: HubFeedUserStatus;
  /** 로딩 종료·애니메이션 중이면 관찰 중단 */
  enabled: boolean;
};

const IMPRESSION_RATIO = 0.5;
const DWELL_EXIT_RATIO = 0.25;
const MIN_DWELL_MS = 500;
const MAX_DWELL_MS = 300_000;

const impressionKey = (id: string) => `hub_feed_impression_${id}`;

/**
 * 허브 피드 카드 가시성
 * - impression: 교차 ≥ 0.5일 때 세션당 1회
 * - dwell: ≥0.5 구간 진입 시각부터, 비가시 또는 비율 0.25 미만으로 이탈 시 MIN_DWELL_MS 이상이면 세션당 1회 전송
 */
export function useHubFeedCardImpression(opts: Options) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!opts.enabled || !opts.activityId) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    let visibleAt: number | null = null;

    const flushDwell = () => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(hubFeedDwellActiveSessionKey(opts.activityId));
      }
      if (visibleAt == null) return;
      const start = visibleAt;
      visibleAt = null;
      const raw = Date.now() - start;
      if (raw < MIN_DWELL_MS) return;
      const dk = hubFeedDwellSessionKey(opts.activityId);
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(dk)) return;
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(dk, "1");
      }
      trackFeedDwell({
        activityId: opts.activityId,
        position: opts.position,
        feedSource: opts.feedSource,
        userStatus: opts.userStatus,
        dwellMs: Math.min(raw, MAX_DWELL_MS),
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== el) continue;
          const ratio = entry.intersectionRatio;

          if (entry.isIntersecting && ratio >= IMPRESSION_RATIO) {
            if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(impressionKey(opts.activityId))) {
              sessionStorage.setItem(impressionKey(opts.activityId), "1");
              trackFeedImpression({
                activityId: opts.activityId,
                position: opts.position,
                feedSource: opts.feedSource,
                userStatus: opts.userStatus,
                visibleRatio: Math.round(ratio * 100) / 100,
              });
            }
            if (visibleAt == null) {
              visibleAt = Date.now();
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.setItem(hubFeedDwellActiveSessionKey(opts.activityId), String(Date.now()));
              }
            }
          } else if (!entry.isIntersecting || ratio < DWELL_EXIT_RATIO) {
            flushDwell();
          }
        }
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    io.observe(el);
    return () => {
      flushDwell();
      io.disconnect();
    };
  }, [opts.enabled, opts.activityId, opts.position, opts.feedSource, opts.userStatus]);

  return ref;
}
