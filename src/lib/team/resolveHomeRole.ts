/**
 * 활성 팀 멤버십(role)만 보고 “홈 세그먼트” 하나를 고름.
 * 우선순위: owner/manager(→admin) > coach > parent > player
 */
export type HomeRoleSegment = "admin" | "coach" | "parent" | "player";

const SEGMENT_PRIORITY: Record<HomeRoleSegment, number> = {
  admin: 4,
  coach: 3,
  parent: 2,
  player: 1,
};

function roleToSegment(roleRaw: string | undefined | null): HomeRoleSegment | null {
  const r = String(roleRaw || "").toLowerCase().trim();
  if (!r) return null;
  if (r === "owner" || r === "manager") return "admin";
  if (r === "coach") return "coach";
  if (r === "parent") return "parent";
  if (r === "player") return "player";
  if (r === "member") return "player";
  if (r === "admin") return "admin";
  return null;
}

export function resolveHomeRoleSegment(
  memberships: Array<{ role?: string | null; status?: string | null }>
): HomeRoleSegment | null {
  const active = memberships.filter((m) => {
    const s = String(m.status || "active").toLowerCase();
    return s === "active" || !m.status;
  });

  let best: HomeRoleSegment | null = null;
  for (const m of active) {
    const seg = roleToSegment(m.role);
    if (!seg) continue;
    if (!best || SEGMENT_PRIORITY[seg] > SEGMENT_PRIORITY[best]) {
      best = seg;
    }
  }
  return best;
}

export function homeSegmentToPath(segment: HomeRoleSegment): string {
  return `/home/${segment === "admin" ? "admin" : segment}`;
}
