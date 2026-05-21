import { normalizeSportId } from "@/constants/sports";
import type { Notification } from "@/types/notification";

type Payload = {
  refType?: string;
  refId?: string;
  activityId?: string;
  teamId?: string;
  sport?: string;
};

function payloadOf(n: Notification): Payload {
  return (n.payload ?? {}) as Payload;
}

/**
 * `payload.refType` / `target` 기반 딥링크 경로.
 * 처리 불가 시 `null` → 호출부에서 기존 `target` / `link` 분기 유지.
 */
export function resolveNotificationDeepLink(n: Notification): string | null {
  if (typeof n.link === "string" && n.link.startsWith("/") && !n.link.includes("://")) {
    return n.link;
  }

  const rawType = String(n.type || "").toLowerCase();
  if (
    (rawType === "fee_reminder" || rawType === "billing_re_register_request") &&
    n.teamId?.trim()
  ) {
    return `/team/${encodeURIComponent(n.teamId.trim())}?tab=home`;
  }

  const p = payloadOf(n);
  const refType = p.refType?.toLowerCase();
  const refId = (p.refId || p.activityId)?.trim();

  if (refType === "activity") {
    if (n.type === "TEAM_WALL_POST" && n.teamId) {
      const q = new URLSearchParams({ tab: "activity" });
      if (refId) q.set("focus", refId);
      return `/team/${encodeURIComponent(n.teamId)}/public?${q.toString()}`;
    }
    const sport = normalizeSportId(p.sport) ?? "soccer";
    if (refId) {
      return `/sports/${encodeURIComponent(sport)}/activity?focus=${encodeURIComponent(refId)}`;
    }
    return `/sports/${encodeURIComponent(sport)}/activity`;
  }

  if (refType === "market" && refId) {
    const sport = normalizeSportId(p.sport) ?? "soccer";
    return `/sports/${encodeURIComponent(sport)}/market/${encodeURIComponent(refId)}`;
  }

  if (refType === "team") {
    const tid = (p.teamId || n.teamId || "").trim();
    if (tid) return `/teams/${encodeURIComponent(tid)}/play`;
  }

  return null;
}
