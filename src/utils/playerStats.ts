/** 플레이(선수 카드·OVR·랭킹) — 목업/향후 Firestore playerStats 공통 */

export type PlayMainPosition = "GK" | "DF" | "MF" | "FW";

export type PlaySixStats = {
  speed: number;
  stamina: number;
  pass: number;
  shoot: number;
  defense: number;
  attitude: number;
};

export type PlayRecentGrowth = Partial<PlaySixStats>;

export type PlayPlayerStatsDoc = {
  teamId: string;
  memberId: string;
  userId?: string;
  displayName: string;
  number?: string;
  positions: string[];
  mainPosition?: PlayMainPosition;
  avatarType?: string;
  stats: PlaySixStats;
  ovr: number;
  level: number;
  exp: number;
  badges: string[];
  recentGrowth: PlayRecentGrowth;
};

const STAT_MIN = 1;
const STAT_MAX = 5;

export function normalizeStat(value: number): number {
  if (!Number.isFinite(value)) return STAT_MIN;
  return Math.max(STAT_MIN, Math.min(STAT_MAX, Math.round(value)));
}

export function createDefaultStats(): PlaySixStats {
  return {
    speed: 3,
    stamina: 3,
    pass: 3,
    shoot: 3,
    defense: 3,
    attitude: 3,
  };
}

/** 능력치 1~5점 → OVR 20~100 (요청 공식과 동일) */
export function calculateOVR(stats: PlaySixStats): number {
  const s = normalizePlaySix(stats);
  const sum = s.speed + s.stamina + s.pass + s.shoot + s.defense + s.attitude;
  return Math.round((sum / 6) * 20);
}

/** Firestore/서비스에서 공통 클램프 */
export function normalizePlaySix(s: PlaySixStats): PlaySixStats {
  return {
    speed: normalizeStat(s.speed),
    stamina: normalizeStat(s.stamina),
    pass: normalizeStat(s.pass),
    shoot: normalizeStat(s.shoot),
    defense: normalizeStat(s.defense),
    attitude: normalizeStat(s.attitude),
  };
}

/**
 * EXP → 레벨 (플레이 루프 v1)
 * 0~99 exp → Lv.1, 100~199 → Lv.2 … 최대 Lv.99
 */
export function calculateLevel(exp: number): number {
  const x = Math.max(0, Math.floor(Number(exp) || 0));
  const lv = 1 + Math.floor(x / 100);
  return Math.min(99, Math.max(1, lv));
}

export function sortPlayersByOVR(players: readonly PlayPlayerStatsDoc[]): PlayPlayerStatsDoc[] {
  return [...players].sort((a, b) => b.ovr - a.ovr);
}

/** 멤버 스냅샷 최소 타입 — Firestore 미연동 시 목업 빌더용 */
export type MemberLikeForPlay = {
  id?: string;
  memberDocumentId?: string;
  uid?: string;
  name?: string;
  displayName?: string;
  jerseyNumber?: string;
  uniformNumber?: string;
  /** DF / MF 등 */
  position?: string;
  userId?: string;
};

export function buildMockPlayerFromMember(teamId: string, m: MemberLikeForPlay): PlayPlayerStatsDoc {
  const memberId = String(m.memberDocumentId || m.uid || m.id || "unknown");
  const displayName =
    String(m.name || "").trim() ||
    String(m.displayName || "").trim() ||
    "선수";
  const numberRaw = m.jerseyNumber ?? m.uniformNumber;
  const number = typeof numberRaw === "string" && numberRaw.trim() ? numberRaw.trim() : undefined;
  const posRaw = typeof m.position === "string" ? m.position.trim().toUpperCase() : "";
  const mainPosition: PlayMainPosition | undefined =
    posRaw === "GK" || posRaw === "DF" || posRaw === "MF" || posRaw === "FW"
      ? posRaw
      : posRaw.includes("미드")
        ? "MF"
        : posRaw.includes("수비")
          ? "DF"
          : posRaw.includes("FW") || posRaw.includes("공격")
            ? "FW"
            : posRaw.includes("GK") || posRaw.includes("키퍼")
              ? "GK"
              : "MF";

  const stats = createDefaultStats();
  const growth: PlayRecentGrowth = {};
  return {
    teamId,
    memberId,
    userId: typeof m.userId === "string" && m.userId.trim() ? m.userId.trim() : undefined,
    displayName,
    number,
    positions: mainPosition ? [mainPosition] : ["MF"],
    mainPosition,
    stats,
    ovr: calculateOVR(stats),
    level: calculateLevel(120),
    exp: 120,
    badges: [],
    recentGrowth: growth,
    avatarType: undefined,
  };
}

/** 플레이 탭 목업 — 팀 ID만 반영하고 나머지는 목 데이터 */
export function buildMockTeamPlayRoster(teamId: string): PlayPlayerStatsDoc[] {
  const base = (partial: Omit<Partial<PlayPlayerStatsDoc>, "teamId"> & Pick<PlayPlayerStatsDoc, "memberId">): PlayPlayerStatsDoc => {
    const stats =
      normalizePlaySix({
        speed: partial.stats?.speed ?? 3,
        stamina: partial.stats?.stamina ?? 3,
        pass: partial.stats?.pass ?? 3,
        shoot: partial.stats?.shoot ?? 3,
        defense: partial.stats?.defense ?? 3,
        attitude: partial.stats?.attitude ?? 3,
      });
    const recentGrowth = partial.recentGrowth ?? {};
    return {
      teamId,
      memberId: partial.memberId,
      userId: partial.userId,
      displayName: partial.displayName ?? "선수",
      number: partial.number,
      positions: partial.positions ?? [],
      mainPosition: partial.mainPosition ?? "MF",
      avatarType: partial.avatarType,
      stats,
      ovr: calculateOVR(stats),
      level: partial.level ?? calculateLevel(partial.exp ?? 240),
      exp: partial.exp ?? 240,
      badges: partial.badges ?? [],
      recentGrowth,
    };
  };

  return [
    base({
      memberId: "mock-1",
      userId: "me-demo",
      displayName: "김야고",
      number: "10",
      mainPosition: "MF",
      positions: ["MF", "FW"],
      stats: { speed: 4, stamina: 4, pass: 5, shoot: 4, defense: 3, attitude: 5 },
      exp: 640,
      badges: ["MVP", "패스마스터", "공정성 기여자"],
      recentGrowth: { pass: 1, stamina: 1 },
    }),
    base({
      memberId: "mock-2",
      displayName: "박수비",
      number: "4",
      mainPosition: "DF",
      positions: ["DF"],
      stats: { speed: 3, stamina: 5, pass: 3, shoot: 2, defense: 5, attitude: 5 },
      exp: 520,
      badges: ["수비벽", "출석왕"],
      recentGrowth: { defense: 1 },
    }),
    base({
      memberId: "mock-3",
      displayName: "이키퍼",
      number: "1",
      mainPosition: "GK",
      positions: ["GK"],
      stats: { speed: 3, stamina: 4, pass: 3, shoot: 2, defense: 4, attitude: 4 },
      exp: 400,
      badges: ["출석왕"],
      recentGrowth: { attitude: 1 },
    }),
    base({
      memberId: "mock-4",
      displayName: "정스트",
      number: "9",
      mainPosition: "FW",
      positions: ["FW"],
      stats: { speed: 5, stamina: 3, pass: 3, shoot: 5, defense: 2, attitude: 3 },
      exp: 360,
      badges: [],
      recentGrowth: { shoot: 1 },
    }),
    base({
      memberId: "mock-5",
      displayName: "최윙",
      number: "11",
      mainPosition: "FW",
      positions: ["FW"],
      stats: { speed: 5, stamina: 3, pass: 4, shoot: 4, defense: 2, attitude: 4 },
      exp: 280,
      badges: [],
      recentGrowth: {},
    }),
    base({
      memberId: "mock-6",
      displayName: "한밸런스",
      number: "6",
      mainPosition: "DF",
      positions: ["DF", "MF"],
      stats: { speed: 3, stamina: 4, pass: 4, shoot: 3, defense: 4, attitude: 4 },
      exp: 300,
      badges: [],
      recentGrowth: { pass: 1 },
    }),
  ].map((row) => ({ ...row, ovr: calculateOVR(normalizePlaySix(row.stats)) }));
}

export function findMyPlayPlayer(roster: readonly PlayPlayerStatsDoc[], authUid?: string): PlayPlayerStatsDoc | undefined {
  if (!authUid?.trim()) return roster[0];
  const me = roster.find((p) => p.userId === authUid.trim());
  return me ?? roster[0];
}

export const PLAY_STAT_KEYS: (keyof PlaySixStats)[] = [
  "speed",
  "stamina",
  "pass",
  "shoot",
  "defense",
  "attitude",
];

export const PLAY_STAT_LABELS_KO: Record<keyof PlaySixStats, string> = {
  speed: "속도",
  stamina: "체력",
  pass: "패스",
  shoot: "슈팅",
  defense: "수비",
  attitude: "태도",
};
