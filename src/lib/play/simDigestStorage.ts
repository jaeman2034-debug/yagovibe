/** 로컬 저장: 팀 단위 시뮬 요약 (크로스 매치 비교용) */
export type PlaySimDigest = {
  matchId: string;
  modeledPassPct: number;
  modeledShotPct: number;
  touchCount: number;
  at: number;
  /** 하이라이트 선수 기준 플레이 성향 스냅샷 */
  highlightPlayStyle?: string;
};

type TeamStore = {
  /** 직전 다른 경기 스냅샷 */
  prior: PlaySimDigest | null;
  /** 가장 최근 실행 (어느 경기든) */
  last: PlaySimDigest | null;
};

const PREFIX = "yago.playSimDigest.v1:";

function readTeam(teamId: string): TeamStore {
  try {
    const raw = localStorage.getItem(PREFIX + teamId);
    if (!raw) return { prior: null, last: null };
    const p = JSON.parse(raw) as TeamStore;
    const norm = (x: unknown): PlaySimDigest | null => {
      if (!x || typeof x !== "object") return null;
      const r = x as PlaySimDigest;
      if (typeof r.matchId !== "string") return null;
      return {
        ...r,
        highlightPlayStyle: typeof r.highlightPlayStyle === "string" ? r.highlightPlayStyle : undefined,
      };
    };
    return {
      prior: norm(p.prior),
      last: norm(p.last),
    };
  } catch {
    return { prior: null, last: null };
  }
}

function writeTeam(teamId: string, s: TeamStore) {
  try {
    localStorage.setItem(PREFIX + teamId, JSON.stringify(s));
  } catch {
    /* storage full / private mode */
  }
}

/** 시뮬 한 번 돌릴 때마다 호출 — matchId가 바뀌면 last → prior */
export function recordPlaySimDigest(teamId: string, digest: Omit<PlaySimDigest, "at"> & { at?: number }): void {
  const tid = teamId.trim();
  if (!tid) return;
  const now = typeof digest.at === "number" ? digest.at : Date.now();
  const row: PlaySimDigest = {
    matchId: digest.matchId,
    modeledPassPct: digest.modeledPassPct,
    modeledShotPct: digest.modeledShotPct,
    touchCount: digest.touchCount,
    at: now,
    ...(digest.highlightPlayStyle ? { highlightPlayStyle: digest.highlightPlayStyle } : {}),
  };

  const store = readTeam(tid);
  if (!store.last) {
    store.last = row;
  } else if (store.last.matchId !== row.matchId) {
    store.prior = store.last;
    store.last = row;
  } else {
    store.last = row;
  }
  writeTeam(tid, store);
}

export function getTeamSimDigestState(teamId: string): { prior: PlaySimDigest | null; last: PlaySimDigest | null } {
  return readTeam(teamId.trim());
}
