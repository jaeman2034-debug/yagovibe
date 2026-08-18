import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import type { ParentLinkRow } from "@/lib/team/parentLinksRead";
import type { PlayerGrowthSessionDoc } from "@/lib/ai-growth/playerGrowthHistoryTypes";

const STAFF_ROLES = new Set([
  "owner",
  "admin",
  "coach",
  "staff",
  "manager",
  "captain",
  "leader",
]);

function rosterNameForPlayer(
  playerUid: string,
  rosterNames: Map<string, string>
): string {
  return rosterNames.get(playerUid)?.trim() || "";
}

/** Sprint D-1d — 보호자·코치 Growth Report 접근 */
export function canAccessGrowthReportSession(input: {
  memberRole: string | null | undefined;
  parentUid: string;
  session: PlayerGrowthSessionDoc;
  parentLinks: ParentLinkRow[];
  rosterNames: Map<string, string>;
}): boolean {
  const role = normalizeMemberRole(input.memberRole ?? "");
  if (STAFF_ROLES.has(role)) return true;

  const activeLinks = input.parentLinks.filter(
    (l) => l.parentUid === input.parentUid && l.status === "active"
  );
  if (activeLinks.length === 0) return false;

  const sessionPlayerId = input.session.playerId?.trim() || "";
  const targetName = input.session.playerName.trim();

  return activeLinks.some((link) => {
    if (sessionPlayerId && link.playerUid === sessionPlayerId) return true;
    const name = rosterNameForPlayer(link.playerUid, input.rosterNames);
    return name !== "" && name === targetName;
  });
}

/** Denied 시 운영·디버그용 사유 (로그 전용) */
export function describeGrowthReportAccessDenial(input: {
  memberRole: string | null | undefined;
  parentUid: string;
  session: PlayerGrowthSessionDoc;
  parentLinks: ParentLinkRow[];
  rosterNames: Map<string, string>;
}): string {
  const role = normalizeMemberRole(input.memberRole ?? "");
  if (STAFF_ROLES.has(role)) return "allowed_staff";

  const activeLinks = input.parentLinks.filter(
    (l) => l.parentUid === input.parentUid && l.status === "active"
  );
  if (activeLinks.length === 0) {
    return `no_active_parent_link parentUid=${input.parentUid}`;
  }

  const sessionPlayerId = input.session.playerId?.trim() || "";
  const targetName = input.session.playerName.trim();
  const linkedPlayerIds = activeLinks.map((l) => l.playerUid).join(",");
  const linkedNames = activeLinks
    .map((l) => rosterNameForPlayer(l.playerUid, input.rosterNames) || "?")
    .join(",");

  return [
    "parent_link_mismatch",
    `role=${role || "none"}`,
    `sessionPlayerId=${sessionPlayerId || "none"}`,
    `sessionPlayerName=${targetName || "none"}`,
    `linkedPlayerIds=${linkedPlayerIds}`,
    `linkedNames=${linkedNames}`,
  ].join(" ");
}
