import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { labelArchetype } from "@/lib/telemetry/leaderboardClient";
import type {
  FriendsGraphClient,
  SocialPlayerSnippetClient,
} from "./socialGraphTypes";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parseSnippet(raw: unknown): SocialPlayerSnippetClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const uid = str(r.uid);
  if (!uid) return null;
  return {
    uid,
    displayName: str(r.displayName) || `Player ${uid.slice(0, 6)}`,
    seasonRank: str(r.seasonRank) || null,
    archetype: str(r.archetype) || "Engine",
    isFollowing: r.isFollowing === true ? true : r.isFollowing === false ? false : undefined,
    isFollower: r.isFollower === true ? true : r.isFollower === false ? false : undefined,
    isMutual: r.isMutual === true ? true : r.isMutual === false ? false : undefined,
  };
}

function parseSnippets(raw: unknown): SocialPlayerSnippetClient[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseSnippet).filter((x): x is SocialPlayerSnippetClient => x != null);
}

export function parseFriendsGraph(raw: unknown): FriendsGraphClient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const metaRaw = r.meta;
  const meta =
    metaRaw && typeof metaRaw === "object"
      ? {
          followingCount: num((metaRaw as Record<string, unknown>).followingCount) ?? 0,
          followersCount: num((metaRaw as Record<string, unknown>).followersCount) ?? 0,
          mutualCount: num((metaRaw as Record<string, unknown>).mutualCount) ?? 0,
        }
      : { followingCount: 0, followersCount: 0, mutualCount: 0 };

  return {
    following: parseSnippets(r.following),
    followers: parseSnippets(r.followers),
    mutuals: parseSnippets(r.mutuals),
    meta,
  };
}

export async function callGetFriendsGraph(): Promise<FriendsGraphClient | null> {
  const fn = httpsCallable<Record<string, never>, { ok: boolean } & FriendsGraphClient>(
    functions,
    "getFriendsGraph",
  );
  const res = await fn({});
  if (!res.data?.ok) return null;
  return parseFriendsGraph(res.data);
}

export async function callFollowPlayer(targetUid: string): Promise<boolean> {
  const fn = httpsCallable<{ targetUid: string }, { ok: boolean }>(functions, "followPlayer");
  const res = await fn({ targetUid: targetUid.trim() });
  return res.data?.ok === true;
}

export async function callUnfollowPlayer(targetUid: string): Promise<boolean> {
  const fn = httpsCallable<{ targetUid: string }, { ok: boolean }>(functions, "unfollowPlayer");
  const res = await fn({ targetUid: targetUid.trim() });
  return res.data?.ok === true;
}

export async function callSearchPlayers(query: string): Promise<SocialPlayerSnippetClient[]> {
  const fn = httpsCallable<{ query: string; limit?: number }, { ok: boolean; results: unknown }>(
    functions,
    "searchPlayers",
  );
  const res = await fn({ query: query.trim(), limit: 20 });
  if (!res.data?.ok) return [];
  return parseSnippets(res.data.results);
}

export function formatPlayerSubtitle(player: SocialPlayerSnippetClient): string {
  const rank = player.seasonRank ?? "Unranked";
  return `${rank} · ${labelArchetype(player.archetype)}`;
}

export { labelArchetype };
