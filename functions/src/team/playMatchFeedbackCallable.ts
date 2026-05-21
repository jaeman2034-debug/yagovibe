/**
 * 경기별 플레이 피드백 — 서버 트랜잭션 (클라 조작 방지)
 * 클라이언트 `submitPlayMatchFeedbackTransactionalClient`와 로직 동기화 유지할 것.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

type PlaySix = Record<"speed" | "stamina" | "pass" | "shoot" | "defense" | "attitude", number>;
type MoodUi = "good" | "ok" | "bad";
type MoodPersisted = "good" | "normal" | "bad";

function normalizeStat(value: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : 1;
  return Math.max(1, Math.min(5, n));
}

function normalizePlaySix(s: Partial<PlaySix> | undefined): PlaySix {
  const d = s ?? {};
  return {
    speed: normalizeStat(Number(d.speed ?? 3)),
    stamina: normalizeStat(Number(d.stamina ?? 3)),
    pass: normalizeStat(Number(d.pass ?? 3)),
    shoot: normalizeStat(Number(d.shoot ?? 3)),
    defense: normalizeStat(Number(d.defense ?? 3)),
    attitude: normalizeStat(Number(d.attitude ?? 3)),
  };
}

function calculateOVR(stats: PlaySix): number {
  const s = normalizePlaySix(stats);
  const sum = s.speed + s.stamina + s.pass + s.shoot + s.defense + s.attitude;
  return Math.round((sum / 6) * 20);
}

function calculateLevel(exp: number): number {
  const x = Math.max(0, Math.floor(Number(exp) || 0));
  const lv = 1 + Math.floor(x / 100);
  return Math.min(99, Math.max(1, lv));
}

function moodExp(mood: MoodUi): number {
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

function moodStatIntent(mood: MoodUi): Partial<PlaySix> {
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

function appliedGrowth(
  prev: PlaySix,
  intent: Partial<PlaySix>
): { next: PlaySix; growth: Record<string, number> } {
  let next: PlaySix = { ...normalizePlaySix(prev) };
  const growth: Record<string, number> = {};
  (Object.entries(intent) as [keyof PlaySix, number][]).forEach(([k, add]) => {
    if (!add) return;
    const before = next[k];
    const raw = normalizeStat(before + add);
    next[k] = raw;
    growth[k] = raw - before;
  });
  next = normalizePlaySix(next);
  return { next, growth };
}

function persistedMood(ui: MoodUi): MoodPersisted {
  if (ui === "ok") return "normal";
  if (ui === "bad") return "bad";
  return "good";
}

function defaultStats(): PlaySix {
  return { speed: 3, stamina: 3, pass: 3, shoot: 3, defense: 3, attitude: 3 };
}

async function syncTeamMvpBadgeServer(teamId: string): Promise<void> {
  const db = getFirestore();
  const snap = await db.collection("teams").doc(teamId).collection("playerStats").get();
  if (snap.empty) return;

  type Row = { id: string; ovr: number };
  const rows: Row[] = snap.docs.map((d) => {
    const sd = (d.data() as { stats?: PlaySix }).stats ?? defaultStats();
    return { id: d.id, ovr: calculateOVR(sd) };
  });
  rows.sort((a, b) => b.ovr - a.ovr);
  const topId = rows[0]?.id;

  const batch = db.batch();
  for (const d of snap.docs) {
    const data = d.data() as { badges?: string[] };
    const badges = Array.isArray(data.badges) ? [...data.badges] : [];
    let nextBadges = badges.filter((b) => b !== "MVP");
    if (d.id === topId) nextBadges.push("MVP");
    nextBadges = [...new Set(nextBadges)];
    batch.update(d.ref, { badges: nextBadges, updatedAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

export const submitPlayMatchFeedback = onCall({ region: REGION, cors: true, maxInstances: 40 }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const raw = request.data as Record<string, unknown> | undefined;
  const teamId = typeof raw?.teamId === "string" ? raw.teamId.trim() : "";
  const matchId = typeof raw?.matchId === "string" ? raw.matchId.trim() : "";
  const memberId = typeof raw?.memberId === "string" ? raw.memberId.trim() : "";
  const moodRaw = typeof raw?.mood === "string" ? raw.mood.trim() : "";
  if (!teamId || !matchId || !memberId) {
    throw new HttpsError("invalid-argument", "teamId, matchId, memberId가 필요합니다.");
  }
  if (moodRaw !== "good" && moodRaw !== "ok" && moodRaw !== "bad") {
    throw new HttpsError("invalid-argument", "mood는 good, ok, bad 중 하나여야 합니다.");
  }
  const mood = moodRaw as MoodUi;

  const db = getFirestore();
  const memberRef = db.collection("teams").doc(teamId).collection("members").doc(memberId);
  const memSnap = await memberRef.get();
  if (!memSnap.exists) {
    throw new HttpsError("permission-denied", "팀 멤버를 찾을 수 없습니다.");
  }
  const memUserId = String((memSnap.data() as { userId?: string }).userId || "").trim();
  if (!memUserId || memUserId !== uid.trim()) {
    throw new HttpsError("permission-denied", "연결된 본인 멤버만 피드백할 수 있습니다.");
  }

  const gameRef = db.collection("team_games").doc(matchId);
  const feedbackRef = db
    .collection("teams")
    .doc(teamId)
    .collection("matches")
    .doc(matchId)
    .collection("feedbacks")
    .doc(memberId);
  const playerRef = db.collection("teams").doc(teamId).collection("playerStats").doc(memberId);
  const stubRef = db.collection("teams").doc(teamId).collection("matches").doc(matchId);

  try {
    const summary = await db.runTransaction(async (t) => {
      const [gameSnap, fbSnap, pSnap] = await Promise.all([t.get(gameRef), t.get(feedbackRef), t.get(playerRef)]);

      if (fbSnap.exists) {
        throw new HttpsError("failed-precondition", "이미 이 경기에 대한 피드백을 보냈습니다.");
      }
      if (!pSnap.exists) {
        throw new HttpsError("failed-precondition", "플레이 카드가 없습니다.");
      }
      if (!gameSnap.exists) {
        throw new HttpsError("not-found", "경기 기록(team_games)을 찾을 수 없습니다.");
      }

      const g = gameSnap.data() as { homeTeamId?: string; awayTeamId?: string; status?: string };
      const home = String(g.homeTeamId || "");
      const away = String(g.awayTeamId || "");
      const inTeam = home === teamId || away === teamId;
      if (!inTeam) {
        throw new HttpsError("permission-denied", "우리 팀 경기만 피드백할 수 있습니다.");
      }
      if (g.status !== "completed") {
        throw new HttpsError("failed-precondition", "종료된 경기만 피드백할 수 있습니다.");
      }

      const rawP = pSnap.data() as { userId?: string; stats?: PlaySix; exp?: number };
      const linkUser = String(rawP.userId || "").trim();
      if (linkUser !== uid.trim()) {
        throw new HttpsError("permission-denied", "내 계정 카드만 갱신할 수 있습니다.");
      }

      const prevNorm = normalizePlaySix(rawP.stats ?? defaultStats());
      const prevOvr = calculateOVR(prevNorm);
      const prevExp = Math.max(0, Math.floor(Number(rawP.exp) || 0));
      const prevLevel = calculateLevel(prevExp);

      const intent = moodStatIntent(mood);
      const { next: nextStats, growth } = appliedGrowth(prevNorm, intent);
      const expDelta = moodExp(mood);
      const nextExp = prevExp + expDelta;
      const nextLevel = calculateLevel(nextExp);
      const nextOvr = calculateOVR(nextStats);
      const moodPersisted = persistedMood(mood);

      t.set(
        stubRef,
        {
          teamId,
          matchId,
          linkedTeamGameId: matchId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      t.set(feedbackRef, {
        teamId,
        matchId,
        memberId,
        userId: uid.trim(),
        mood: moodPersisted,
        expDelta,
        statGrowth: growth,
        createdAt: FieldValue.serverTimestamp(),
      });

      t.update(playerRef, {
        stats: nextStats,
        recentGrowth: growth,
        exp: nextExp,
        level: nextLevel,
        ovr: nextOvr,
        lastMatchAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        prevOvr,
        nextOvr,
        prevExp,
        nextExp,
        prevLevel,
        nextLevel,
        expDelta,
        growth,
        moodPersisted,
      };
    });

    await syncTeamMvpBadgeServer(teamId);
    return { summary };
  } catch (e: unknown) {
    if (e instanceof HttpsError) throw e;
    logger.error("[submitPlayMatchFeedback] unexpected", e);
    throw new HttpsError("internal", "피드백 처리 중 오류가 났습니다.");
  }
});
