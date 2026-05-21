import type { Timestamp } from "firebase/firestore";
import type { PlayRecentGrowth } from "@/utils/playerStats";

/** Firestore `feedbacks/{memberId}.mood` — 문서 레벨에서는 normal 사용 (UI 버튼 라벨 “보통”과 동일 의미) */
export type PersistedPlayFeedbackMood = "good" | "normal" | "bad";

/** 제출 직후 요약 UI용 (트랜잭션 계산값) */
export type PlayFeedbackSubmitSummary = {
  prevOvr: number;
  nextOvr: number;
  prevExp: number;
  nextExp: number;
  prevLevel: number;
  nextLevel: number;
  expDelta: number;
  growth: PlayRecentGrowth;
  moodPersisted: PersistedPlayFeedbackMood;
};

export type TeamMatchFeedbackFirestoreDoc = {
  teamId: string;
  matchId: string;
  memberId: string;
  userId: string;
  mood: PersistedPlayFeedbackMood;
  expDelta: number;
  statGrowth: PlayRecentGrowth;
  createdAt?: Timestamp | null;
};
