import type { PlayTabMvpBanner } from "@/lib/play/playTabCanonicalMvp";
import type { SimMatchEvent } from "@/lib/play/simulation";

export type StoredPlayTabMvpBundleV1 = {
  v: 1;
  matchId: string;
  matchLabel?: string;
  mvp: PlayTabMvpBanner;
  events: SimMatchEvent[];
  savedAt: number;
};

const PREFIX = "yago.playTab.lastMvpBundle.v1:";
const MAX_EVENTS = 480;

function key(teamId: string): string {
  return PREFIX + teamId.trim();
}

export function savePlayTabLastMvpBundle(
  teamId: string,
  input: {
    matchId: string;
    matchLabel?: string;
    mvp: PlayTabMvpBanner;
    events: readonly SimMatchEvent[];
  }
): void {
  const tid = teamId.trim();
  if (!tid) return;
  try {
    const events = input.events.slice(0, MAX_EVENTS);
    const row: StoredPlayTabMvpBundleV1 = {
      v: 1,
      matchId: input.matchId.trim(),
      ...(input.matchLabel?.trim() ? { matchLabel: input.matchLabel.trim() } : {}),
      mvp: input.mvp,
      events: [...events],
      savedAt: Date.now(),
    };
    localStorage.setItem(key(tid), JSON.stringify(row));
  } catch {
    /* quota */
  }
}

export function loadPlayTabLastMvpBundle(teamId: string): StoredPlayTabMvpBundleV1 | null {
  const tid = teamId.trim();
  if (!tid) return null;
  try {
    const raw = localStorage.getItem(key(tid));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredPlayTabMvpBundleV1>;
    if (p.v !== 1 || typeof p.matchId !== "string" || !p.mvp || !Array.isArray(p.events)) return null;
    return {
      v: 1,
      matchId: p.matchId,
      matchLabel: typeof p.matchLabel === "string" ? p.matchLabel : undefined,
      mvp: p.mvp as PlayTabMvpBanner,
      events: p.events as SimMatchEvent[],
      savedAt: typeof p.savedAt === "number" ? p.savedAt : 0,
    };
  } catch {
    return null;
  }
}
