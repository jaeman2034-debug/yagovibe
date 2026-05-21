import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { devError } from "@/lib/utils/dev";
import type { MiniShotGoalZone } from "@/lib/team/miniShotZone";

export type MiniShotDailyChallenge = {
  id: string;
  title: string;
  targetZone: MiniShotGoalZone;
  requiredHits: number;
  rewardScore: number;
  rewardXp: number;
};

function todayKeyLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function buildChallengeByKey(key: string): MiniShotDailyChallenge {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  const byWeekday: Record<number, Omit<MiniShotDailyChallenge, "id">> = {
    // 월: EASY 진입
    1: {
      title: "월요일 챌린지: 중앙하단 1회",
      targetZone: { row: 1, col: 1 },
      requiredHits: 1,
      rewardScore: 35,
      rewardXp: 35,
    },
    // 화: 중앙 정확도
    2: {
      title: "화요일 챌린지: 중앙상단 2연속",
      targetZone: { row: 0, col: 1 },
      requiredHits: 2,
      rewardScore: 60,
      rewardXp: 60,
    },
    // 수: 좌/우 분리 (주차별 교대)
    3: {
      title: Number(key.slice(-1)) % 2 === 0 ? "수요일 챌린지: 좌하단 2연속" : "수요일 챌린지: 우하단 2연속",
      targetZone: Number(key.slice(-1)) % 2 === 0 ? { row: 1, col: 0 } : { row: 1, col: 2 },
      requiredHits: 2,
      rewardScore: 55,
      rewardXp: 55,
    },
    // 목: 상단 도전
    4: {
      title: "목요일 챌린지: 중앙상단 3연속",
      targetZone: { row: 0, col: 1 },
      requiredHits: 3,
      rewardScore: 85,
      rewardXp: 85,
    },
    // 금: 코너 2연속
    5: {
      title: Number(key.slice(-1)) % 2 === 0 ? "금요일 챌린지: 좌상단 2연속" : "금요일 챌린지: 우상단 2연속",
      targetZone: Number(key.slice(-1)) % 2 === 0 ? { row: 0, col: 0 } : { row: 0, col: 2 },
      requiredHits: 2,
      rewardScore: 90,
      rewardXp: 90,
    },
    // 토: HARD 랜덤 (상단 코너 2~3회)
    6: {
      title: Number(key.slice(-1)) % 2 === 0 ? "토요일 HARD: 좌상단 3연속" : "토요일 HARD: 우상단 3연속",
      targetZone: Number(key.slice(-1)) % 2 === 0 ? { row: 0, col: 0 } : { row: 0, col: 2 },
      requiredHits: 3,
      rewardScore: 120,
      rewardXp: 120,
    },
    // 일: 챌린지 데이
    0: {
      title: "일요일 챌린지: 상단 코너 3연속",
      targetZone: Number(key.slice(-1)) % 2 === 0 ? { row: 0, col: 0 } : { row: 0, col: 2 },
      requiredHits: 3,
      rewardScore: 130,
      rewardXp: 130,
    },
  };
  const fallback = byWeekday[1];
  const p = byWeekday[dow] ?? fallback;
  return { id: key, ...p };
}

export function useMiniShotDailyChallenge(teamId?: string, enabled = true, viewerUid?: string | null) {
  const [challenge, setChallenge] = useState<MiniShotDailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  useEffect(() => {
    const tid = typeof teamId === "string" ? teamId.trim() : "";
    if (!enabled || !tid) {
      setChallenge(null);
      setLoading(false);
      return;
    }

    const key = todayKeyLocal();
    const fallback = buildChallengeByKey(key);
    const ref = doc(db, "teams", tid, "miniShotDailyChallenges", key);
    setLoading(true);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const targetZone = data.targetZone as MiniShotGoalZone | undefined;
          const loaded: MiniShotDailyChallenge = {
            id: key,
            title: typeof data.title === "string" ? data.title : fallback.title,
            targetZone:
              targetZone &&
              (targetZone.row === 0 || targetZone.row === 1) &&
              (targetZone.col === 0 || targetZone.col === 1 || targetZone.col === 2)
                ? targetZone
                : fallback.targetZone,
            requiredHits:
              typeof data.requiredHits === "number" && data.requiredHits > 0
                ? Math.floor(data.requiredHits)
                : fallback.requiredHits,
            rewardScore:
              typeof data.rewardScore === "number" ? Math.floor(data.rewardScore) : fallback.rewardScore,
            rewardXp: typeof data.rewardXp === "number" ? Math.floor(data.rewardXp) : fallback.rewardXp,
          };
          setChallenge(loaded);
          setLoading(false);
          return;
        }

        setChallenge(fallback);
        setLoading(false);
        void setDoc(
          ref,
          {
            title: fallback.title,
            targetZone: fallback.targetZone,
            requiredHits: fallback.requiredHits,
            rewardScore: fallback.rewardScore,
            rewardXp: fallback.rewardXp,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        ).catch((e) => devError("daily challenge seed write 실패:", e));
      },
      (err) => {
        devError("daily challenge subscribe 실패:", err);
        setChallenge(fallback);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, enabled]);

  useEffect(() => {
    const tid = typeof teamId === "string" ? teamId.trim() : "";
    const uid = typeof viewerUid === "string" ? viewerUid.trim() : "";
    const key = todayKeyLocal();
    if (!enabled || !tid || !uid) {
      setAlreadyClaimed(false);
      return;
    }
    const ref = doc(db, "teams", tid, "miniShotDailyUserProgress", `${uid}_${key}`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setAlreadyClaimed(snap.exists() && snap.data().cleared === true);
      },
      () => {
        setAlreadyClaimed(false);
      }
    );
    return () => unsub();
  }, [teamId, enabled, viewerUid]);

  return { challenge, loading, alreadyClaimed };
}

