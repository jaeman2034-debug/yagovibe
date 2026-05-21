import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  mergeTeamPlayHud,
  type TeamPlayHudSnapshot,
  type TeamPlayXpFloatPayload,
} from "@/components/team/play/hud/teamPlayHudTypes";
import { TRACK } from "@/lib/analytics";
import { playTeamPlayLevelUpSound } from "@/lib/team/playTeamPlayLevelUpSound";
import { TEAM_PLAY_HUD_REVEAL_EVENT, type TeamPlayHudRevealDetail } from "@/lib/team/teamPlayHudEvents";

/** 경기 반영 직후 → XP 플로트 (숫자 인지 최우선, ~0.1s) */
const XP_FLOAT_SHOW_MS = 90;
/** XP 플로트 직후 → HUD 코어(OVR·XP 바·문구) 병합 */
const HUD_CORE_DELAY_MS = 280;
/** HUD 코어 반영 후 → 레벨업 플래시·사운드 (큰 이벤트는 가장 나중) */
const LEVEL_UP_AFTER_HUD_MS = 220;
/** 플로팅 enter 유지 + exit 여유 (AnimatePresence exit 전 짧은 정지) */
const XP_FLOAT_UNMOUNT_MS = 860;
/** 카드 위 짧은 레벨업 플래시 표시 시간 */
const LEVEL_UP_BURST_MS = 520;
/** XP·HUD·(레벨업) 직후 — 다음 행동 CTA (골든 타임 ~0.7s) */
const POST_REWARD_CTA_MS = 720;

export type UseTeamPlayHudRevealOptions = {
  /** `LEVEL_UP` 등 분석 파라미터용 (없으면 생략) */
  teamId?: string;
};

/**
 * HUD 스냅샷 + 경기 반영 시 순차 연출: XP 플로트 → HUD 코어 병합 → (있으면) 레벨업 버스트
 */
export function useTeamPlayHudReveal(options?: UseTeamPlayHudRevealOptions) {
  const teamIdRef = useRef(options?.teamId?.trim() ?? "");
  useEffect(() => {
    teamIdRef.current = options?.teamId?.trim() ?? "";
  }, [options?.teamId]);
  const [overrides, setOverrides] = useState<Partial<TeamPlayHudSnapshot>>({});
  const [revealSeq, setRevealSeq] = useState(0);
  const [xpFloat, setXpFloat] = useState<TeamPlayXpFloatPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextActionCtaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpFloatTokenRef = useRef(0);
  const xpEchoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelUpTokenRef = useRef(0);
  const [hudXpEcho, setHudXpEcho] = useState<{ amount: number } | null>(null);
  const [hudLevelUpBurst, setHudLevelUpBurst] = useState<{
    fromLevel: number;
    toLevel: number;
    token: number;
  } | null>(null);
  const [postRewardNextActionCta, setPostRewardNextActionCta] = useState(false);

  const snapshot = useMemo(() => mergeTeamPlayHud(overrides), [overrides]);

  const clearXpTimers = useCallback(() => {
    if (xpShowTimerRef.current) {
      clearTimeout(xpShowTimerRef.current);
      xpShowTimerRef.current = null;
    }
    if (xpClearTimerRef.current) {
      clearTimeout(xpClearTimerRef.current);
      xpClearTimerRef.current = null;
    }
    if (xpEchoClearRef.current) {
      clearTimeout(xpEchoClearRef.current);
      xpEchoClearRef.current = null;
    }
    if (levelUpClearRef.current) {
      clearTimeout(levelUpClearRef.current);
      levelUpClearRef.current = null;
    }
    if (levelUpDelayRef.current) {
      clearTimeout(levelUpDelayRef.current);
      levelUpDelayRef.current = null;
    }
    if (nextActionCtaTimerRef.current) {
      clearTimeout(nextActionCtaTimerRef.current);
      nextActionCtaTimerRef.current = null;
    }
  }, []);

  const applyPostMatchUpdate = useCallback(
    (next: TeamPlayHudRevealDetail) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (levelUpDelayRef.current) {
        clearTimeout(levelUpDelayRef.current);
        levelUpDelayRef.current = null;
      }
      if (nextActionCtaTimerRef.current) {
        clearTimeout(nextActionCtaTimerRef.current);
        nextActionCtaTimerRef.current = null;
      }
      clearXpTimers();
      setXpFloat(null);
      setHudLevelUpBurst(null);
      setPostRewardNextActionCta(false);

      const gain = next.xpGainRecent;
      const showFloat = typeof gain === "number" && gain > 0;
      const token = ++xpFloatTokenRef.current;
      const { levelUpBurst, ...hudPatch } = next;

      if (showFloat) {
        xpShowTimerRef.current = setTimeout(() => {
          setXpFloat({ amount: gain, token });
          xpShowTimerRef.current = null;
        }, XP_FLOAT_SHOW_MS);

        xpClearTimerRef.current = setTimeout(() => {
          setXpFloat((prev) => (prev?.token === token ? null : prev));
          xpClearTimerRef.current = null;
        }, XP_FLOAT_SHOW_MS + XP_FLOAT_UNMOUNT_MS);
      }

      timerRef.current = setTimeout(() => {
        setOverrides((prev) => ({ ...prev, ...hudPatch }));
        setRevealSeq((n) => n + 1);
        const echo = next.xpGainRecent;
        if (typeof echo === "number" && echo > 0) {
          setHudXpEcho({ amount: echo });
          if (xpEchoClearRef.current) clearTimeout(xpEchoClearRef.current);
          xpEchoClearRef.current = setTimeout(() => {
            setHudXpEcho(null);
            xpEchoClearRef.current = null;
          }, 1600);
        }
        timerRef.current = null;

        const canLevelUp =
          levelUpBurst &&
          levelUpBurst.toLevel > levelUpBurst.fromLevel &&
          levelUpBurst.fromLevel >= 1;
        if (canLevelUp) {
          levelUpDelayRef.current = setTimeout(() => {
            levelUpDelayRef.current = null;
            const t = ++levelUpTokenRef.current;
            setHudLevelUpBurst({ ...levelUpBurst, token: t });
            TRACK("LEVEL_UP", {
              team_id: teamIdRef.current || "unknown",
              from_level: levelUpBurst.fromLevel,
              to_level: levelUpBurst.toLevel,
            });
            playTeamPlayLevelUpSound();
            if (levelUpClearRef.current) clearTimeout(levelUpClearRef.current);
            levelUpClearRef.current = setTimeout(() => {
              setHudLevelUpBurst(null);
              levelUpClearRef.current = null;
            }, LEVEL_UP_BURST_MS);
          }, LEVEL_UP_AFTER_HUD_MS);
        }
      }, HUD_CORE_DELAY_MS);

      nextActionCtaTimerRef.current = setTimeout(() => {
        nextActionCtaTimerRef.current = null;
        setPostRewardNextActionCta(true);
      }, POST_REWARD_CTA_MS);
    },
    [clearXpTimers]
  );

  const dismissPostRewardNextActionCta = useCallback(() => {
    setPostRewardNextActionCta(false);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (levelUpDelayRef.current) clearTimeout(levelUpDelayRef.current);
      if (nextActionCtaTimerRef.current) clearTimeout(nextActionCtaTimerRef.current);
      clearXpTimers();
    },
    [clearXpTimers]
  );

  useEffect(() => {
    const onReveal = (ev: Event) => {
      const ce = ev as CustomEvent<TeamPlayHudRevealDetail>;
      if (ce.detail && typeof ce.detail === "object") {
        applyPostMatchUpdate(ce.detail);
      }
    };
    window.addEventListener(TEAM_PLAY_HUD_REVEAL_EVENT, onReveal);
    return () => window.removeEventListener(TEAM_PLAY_HUD_REVEAL_EVENT, onReveal);
  }, [applyPostMatchUpdate]);

  return {
    snapshot,
    revealSeq,
    applyPostMatchUpdate,
    xpFloat,
    /** HUD 아래 짧게 남기는 XP 잔상 (보상 여운) */
    hudXpEcho,
    /** OVR 카드 위 짧은 레벨업 플래시 */
    hudLevelUpBurst,
    /** 첫 페인트는 false, 반영 루프부터 순차 연출 */
    staggerHudReveal: revealSeq > 0,
    /** 보상 연출 직후(≈0.72s) 다음 행동 유도 배너 */
    postRewardNextActionCta,
    dismissPostRewardNextActionCta,
  };
}
