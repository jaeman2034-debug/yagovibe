/**
 * teams/{teamId}/playerStats/{memberId}
 * 플레이 카드 동기화 · 경기 후 피드백 반영 · MVP 배지 동기화
 */

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MatchFeedbackMood, TeamPlayerStatsFirestoreDoc } from "@/types/teamPlayerStats";
import type { MemberLikeForPlay } from "@/utils/playerStats";
import type { PlayRecentGrowth } from "@/utils/playerStats";
import type { PlaySixStats } from "@/utils/playerStats";
import type { TeamPlayerStatsUI } from "@/types/teamPlayerStats";
import {
  calculateLevel,
  calculateOVR,
  createDefaultStats,
  normalizeStat,
  normalizePlaySix,
  sortPlayersByOVR,
} from "@/utils/playerStats";

const COLL = "playerStats";

export function playerStatDocRef(teamId: string, memberId: string) {
  return doc(db, "teams", teamId, COLL, memberId);
}

export function firestoreTeamPlayerStatsCollection(teamId: string) {
  return collection(db, "teams", teamId, COLL);
}

export function moodExp(mood: MatchFeedbackMood): number {
  switch (mood) {
    case "good":
      return 20;
    case "ok":
      return 10;
    case "bad":
      return 5;
    default:
      return 10;
  }
}

/** 기본 루프: 좋음 pass·stamina, 보통 태도, 아쉬움 수비 */
export function moodStatIntent(mood: MatchFeedbackMood): Partial<PlaySixStats> {
  switch (mood) {
    case "good":
      return { pass: 1, stamina: 1 };
    case "ok":
      return { attitude: 1 };
    case "bad":
      return { defense: 1 };
    default:
      return {};
  }
}

export function appliedGrowth(prev: PlaySixStats, intent: Partial<PlaySixStats>): {
  next: PlaySixStats;
  growth: PlayRecentGrowth;
} {
  let next = { ...normalizePlaySix(prev) };
  const growth: PlayRecentGrowth = {};
  (Object.entries(intent) as [keyof PlaySixStats, number][]).forEach(([k, add]) => {
    if (!add || add === 0) return;
    const before = next[k];
    const raw = normalizeStat(before + add);
    next[k] = raw;
    growth[k] = raw - before;
  });
  next = normalizePlaySix(next);
  return { next, growth };
}

/** onSnapshot 매핑용 — 스탯·OVR·레벨 재계산 */
export function snapshotToTeamPlayerUi(memberId: string, raw: Record<string, unknown>): TeamPlayerStatsUI {
  const data = raw as unknown as TeamPlayerStatsFirestoreDoc;
  const lastTs = data.lastMatchAt as Timestamp | undefined | null;
  const lastMillis = lastTs && typeof lastTs.toMillis === "function" ? lastTs.toMillis() : undefined;

  const stats = normalizePlaySix(data.stats ?? createDefaultStats());
  const exp = typeof data.exp === "number" && Number.isFinite(data.exp) ? Math.floor(data.exp) : 0;
  return {
    teamId: String(data.teamId ?? ""),
    memberId: String(data.memberId ?? memberId),
    userId: typeof data.userId === "string" && data.userId.trim() ? data.userId.trim() : undefined,
    displayName: typeof data.displayName === "string" && data.displayName.trim() ? data.displayName.trim() : "선수",
    number: typeof data.number === "string" && data.number.trim() ? data.number.trim() : undefined,
    positions: Array.isArray(data.positions) ? [...data.positions] : [],
    mainPosition: data.mainPosition,
    avatarType: data.avatarType,
    stats,
    ovr: calculateOVR(stats),
    level: calculateLevel(exp),
    exp,
    badges: Array.isArray(data.badges) ? [...data.badges] : [],
    recentGrowth:
      typeof data.recentGrowth === "object" && data.recentGrowth && !Array.isArray(data.recentGrowth)
        ? { ...data.recentGrowth }
        : {},
    lastMatchAtMillis: lastMillis,
  };
}

export async function fetchTeamPlayersStatsUi(teamId: string): Promise<TeamPlayerStatsUI[]> {
  const snap = await getDocs(firestoreTeamPlayerStatsCollection(teamId));
  return snap.docs
    .map((d) => snapshotToTeamPlayerUi(d.id, d.data()))
    .filter((p) => p.memberId)
    .sort((a, b) => b.ovr - a.ovr);
}

/** 멤버 기준 카드 초기 생성(merge — 이미 있으면 유지) */
export async function ensurePlayerStatsDoc(teamId: string, member: MemberLikeForPlay): Promise<void> {
  const memberId = String(member.memberDocumentId || member.uid || member.id || "").trim();
  if (!memberId) return;

  const displayName =
    String(member.name || "").trim() ||
    String(member.displayName || "").trim() ||
    "선수";
  const userIdRaw = member.userId ?? member.uid;
  const userId = typeof userIdRaw === "string" && userIdRaw.trim() ? userIdRaw.trim() : undefined;
  const numberRaw = member.jerseyNumber ?? member.uniformNumber;
  const number =
    typeof numberRaw === "number" && Number.isFinite(numberRaw)
      ? String(numberRaw)
      : typeof numberRaw === "string" && numberRaw.trim()
        ? numberRaw.trim()
        : undefined;

  const posRaw = typeof member.position === "string" ? member.position.trim().toUpperCase() : "";
  const main =
    posRaw === "GK" || posRaw === "DF" || posRaw === "MF" || posRaw === "FW"
      ? posRaw
      : ("MF" as const);
  const positions = posRaw && ["GK", "DF", "MF", "FW"].includes(posRaw) ? [posRaw] : [main];

  const stats = createDefaultStats();
  const payload: Record<string, unknown> = {
    teamId,
    memberId,
    displayName,
    positions,
    mainPosition: main,
    stats,
    exp: 0,
    badges: [],
    recentGrowth: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (userId) payload.userId = userId;
  if (number) payload.number = number;

  payload.ovr = calculateOVR(stats);
  payload.level = calculateLevel(0);

  await setDoc(playerStatDocRef(teamId, memberId), payload, { merge: true });
}

/** playerStats 업데이트 페이로드 (경기별 피드백 등에서 재사용) */
export function buildPlayerUpdateFromMood(
  rawPlayer: Pick<TeamPlayerStatsFirestoreDoc, "stats" | "exp">,
  mood: MatchFeedbackMood
): {
  stats: PlaySixStats;
  recentGrowth: PlayRecentGrowth;
  exp: number;
  level: number;
  ovr: number;
  expDelta: number;
} {
  const stats = normalizePlaySix(rawPlayer.stats ?? createDefaultStats());
  const intent = moodStatIntent(mood);
  const { next: nextStats, growth } = appliedGrowth(stats, intent);
  const delta = moodExp(mood);
  const exp = Math.max(0, Math.floor(Number(rawPlayer.exp) || 0)) + delta;
  return {
    stats: nextStats,
    recentGrowth: growth,
    exp,
    level: calculateLevel(exp),
    ovr: calculateOVR(nextStats),
    expDelta: delta,
  };
}

/** OVR 1위에 MVP 배지 (간단 버전) */
export async function syncTeamMvpBadge(teamId: string): Promise<void> {
  const snap = await getDocs(firestoreTeamPlayerStatsCollection(teamId));
  if (snap.empty) return;

  const roster = snap.docs.map((d) => snapshotToTeamPlayerUi(d.id, d.data()));
  const sorted = sortPlayersByOVR(roster);
  const topId = sorted[0]?.memberId;

  const batch = writeBatch(db);
  for (const d of snap.docs) {
    const data = d.data() as TeamPlayerStatsFirestoreDoc;
    const badges = Array.isArray(data.badges) ? [...data.badges] : [];
    let nextBadges = badges.filter((b) => b !== "MVP");
    if (d.id === topId) {
      nextBadges = [...nextBadges, "MVP"];
    }
    nextBadges = [...new Set(nextBadges)];
    batch.update(d.ref, { badges: nextBadges, updatedAt: serverTimestamp() });
  }
  await batch.commit();
}
