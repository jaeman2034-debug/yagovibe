import { livePlayerPath } from "./liveMatchRtdb";
import type { LivePlayerState } from "./liveMatchTypes";

const FORBIDDEN_PLAYER_KEY = /^(current|me|position|host|guest|local|remote|0|1)$/i;

/** RTDB players 맵에 uid가 아닌 키가 있으면 공용 노드 버그 */
export function findAlienPlayerKeys(
  raw: Record<string, unknown> | null | undefined,
  playerUids: [string, string],
): string[] {
  if (!raw) return [];
  const allowed = new Set(playerUids);
  return Object.keys(raw).filter((k) => Boolean(k) && !allowed.has(k));
}

export function assertCanonicalPlayerWritePath(
  sessionId: string,
  authUid: string,
  path: string,
): boolean {
  const expected = livePlayerPath(sessionId, authUid);
  if (path !== expected) {
    console.error("[liveMatch] WRITE PATH mismatch", { expected, path, authUid: authUid.slice(0, 8) });
    return false;
  }
  const tail = path.split("/players/")[1] ?? "";
  if (!tail || tail !== authUid || FORBIDDEN_PLAYER_KEY.test(tail)) {
    console.error("[liveMatch] WRITE PATH forbidden tail", { tail, path });
    return false;
  }
  return true;
}

let lastReadLogKey = "";
let lastReadLogAt = 0;

/** DEV: onValue players — uid 슬롯별 좌표·이질 키 노출 */
export function logRtdbPlayersRead(
  sessionId: string,
  playerUids: [string, string],
  authUid: string,
  raw: Record<string, LivePlayerState | null | undefined> | null | undefined,
  canonical: Record<string, LivePlayerState>,
): void {
  if (!import.meta.env.DEV || !raw) return;

  const aliens = findAlienPlayerKeys(raw as Record<string, unknown>, playerUids);
  const [uidA, uidB] = playerUids;
  const pa = canonical[uidA] ?? raw[uidA];
  const pb = canonical[uidB] ?? raw[uidB];
  const moving =
    (pa && Math.hypot(pa.vx ?? 0, pa.vy ?? 0) > 10) ||
    (pb && Math.hypot(pb.vx ?? 0, pb.vy ?? 0) > 10);
  if (!moving && aliens.length === 0) return;

  const now = Date.now();
  const key = `${Math.round(pa?.x ?? 0)}:${Math.round(pb?.x ?? 0)}:${aliens.join(",")}`;
  if (key === lastReadLogKey && now - lastReadLogAt < 500) return;
  lastReadLogKey = key;
  lastReadLogAt = now;

  console.log("[RTDB READ] liveSessions/.../players", {
    session: sessionId.slice(0, 8),
    auth: authUid.slice(0, 8),
    slotA: uidA.slice(0, 8),
    slotB: uidB.slice(0, 8),
    pathA: livePlayerPath(sessionId, uidA),
    pathB: livePlayerPath(sessionId, uidB),
    posA: pa ? { x: Math.round(pa.x), y: Math.round(pa.y), vx: Math.round(pa.vx ?? 0) } : null,
    posB: pb ? { x: Math.round(pb.x), y: Math.round(pb.y), vx: Math.round(pb.vx ?? 0) } : null,
    rawKeys: Object.keys(raw),
    alienKeys: aliens.length ? aliens : undefined,
  });

  if (aliens.length) {
    console.error(
      "[liveMatch] RTDB players has non-uid keys (shared node?) — remove:",
      aliens,
    );
  }
}

/** DEV: 두 uid 슬롯이 동일 좌표로 덮이면 공용 노드·잘못된 write 의심 */
export function warnRtdbPlayerSlotCollision(
  raw: Record<string, LivePlayerState | null | undefined> | null | undefined,
  playerUids: [string, string],
): void {
  if (!import.meta.env.DEV || !raw) return;
  const [a, b] = playerUids;
  const pa = raw[a];
  const pb = raw[b];
  if (!pa || !pb) return;
  if (!Number.isFinite(pa.x) || !Number.isFinite(pb.x)) return;
  if (Math.hypot(pa.x - pb.x, pa.y - pb.y) > 4) return;

  const va = Math.hypot(pa.vx ?? 0, pa.vy ?? 0);
  const vb = Math.hypot(pb.vx ?? 0, pb.vy ?? 0);
  const oneMoving = (va > 10 && vb < 8) || (vb > 10 && va < 8);
  if (!oneMoving) return;

  console.warn("[liveMatch] RTDB SLOT COLLISION — both players share x/y (check Firebase players/* keys)", {
    uidA: a.slice(0, 8),
    uidB: b.slice(0, 8),
    x: Math.round(pa.x),
    y: Math.round(pa.y),
    vxA: Math.round(pa.vx ?? 0),
    vyA: Math.round(pa.vy ?? 0),
    vxB: Math.round(pb.vx ?? 0),
    vyB: Math.round(pb.vy ?? 0),
  });
}

/** 상대 슬롯 좌표가 내 슬롯과 같고 내 쪽만 움직일 때 — puppet이 local을 따라감 */
export function isOpponentPoseEchoingOwn(
  own: LivePlayerState | null | undefined,
  opponent: LivePlayerState | null | undefined,
  proximityPx = 14,
): boolean {
  if (!own || !opponent) return false;
  if (!Number.isFinite(own.x) || !Number.isFinite(opponent.x)) return false;
  if (Math.hypot(own.x - opponent.x, own.y - opponent.y) > proximityPx) return false;
  const ownMoving = Math.hypot(own.vx ?? 0, own.vy ?? 0) > 10;
  const oppMoving = Math.hypot(opponent.vx ?? 0, opponent.vy ?? 0) > 10;
  return ownMoving && !oppMoving;
}
